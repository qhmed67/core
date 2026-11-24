// core-managed: installed by qhmed67/core. Edit the copy in that repository, not this file.
//
// OpenCode plugin. Two jobs:
//   1. tool.execute.before: refuse commands that bypass the git policy or read secrets.
//   2. experimental.session.compacting: carry .agent/state.md through compaction.
//
// Keep this file to ONE export. OpenCode calls every export as a plugin.
import fs from 'node:fs';
import path from 'node:path';

const MAX_STATE_CHARS = 3000;

// Keep in sync with CORE_AGENT_PATHS in githooks/identity. scripts/test-plugin.mjs
// fails when the two lists differ.
const AGENT_PATHS = [
  '.opencode',
  '.claude',
  '.agents',
  '.agent',
  '.cursor',
  '.windsurf',
  '.codex',
  '.gemini',
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'opencode.json',
  'opencode.jsonc',
  '.mcp.json',
];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A git add argument naming an agent file or directory, at any depth.
const AGENT_PATH_RE = new RegExp(
  '(^|\\s)["\']?(\\./)?([^\\s"\']*/)?(' +
    AGENT_PATHS.map(escapeRe).join('|') +
    ')(/[^\\s"\']*)?(?=["\']?(\\s|$))',
);

// Each rule: [test(segment), reason]. A segment is one simple command.
const RULES = [
  [
    (s) => /\bgit\b/.test(s) && /\s--no-verify\b/.test(s),
    'git --no-verify skips the hooks',
  ],
  [
    (s) => /\bgit\b.*\bcommit\b/.test(s) && /\s-[A-Za-z]*n[A-Za-z]*(\s|$)/.test(s),
    'git commit -n skips the hooks',
  ],
  [
    (s) => /\bgit\b/.test(s) && /core\.hooksPath/.test(s),
    'changing core.hooksPath disables the hooks',
  ],
  [
    (s) =>
      /\bgit\b.*\bpush\b/.test(s) &&
      (/\s--force(-with-lease|-if-includes)?\b/.test(s) ||
        /\s-[A-Za-z]*f[A-Za-z]*(\s|$)/.test(s) ||
        /\s\+\S/.test(s)),
    'force push is not allowed',
  ],
  [
    (s) => /\bgit\b(\s+-[Cc]\s+\S+)*\s+add\b/.test(s) && /\s(-A|--all|\.|\.\/|\*)(?=\s|$|["'])/.test(s),
    'stage explicit paths, never git add -A or git add .',
  ],
  [
    (s) => /\bgit\b(\s+-[Cc]\s+\S+)*\s+add\b/.test(s) && AGENT_PATH_RE.test(s.replace(/^.*?\badd\b/, '')),
    'agent and tool files are never added to a repository',
  ],
  [
    (s) => /\bCORE_ALLOW_[A-Z_]+=/.test(s),
    'CORE_ALLOW_* overrides are for the owner, not for agents',
  ],
  [
    (s) => /\.git[\\/]hooks/.test(s) && (/\b(rm|mv|cp|chmod|tee|truncate|ln)\b/.test(s) || />|sed\s+-i/.test(s)),
    'do not modify .git/hooks',
  ],
  [(s) => /^(printenv|env)(\s*$|\s+-0)/.test(s), 'do not print environment variables'],
  [
    (s) =>
      /\b(cat|less|more|head|tail|bat|type|source|grep|rg)\b[^|;&]*?\s(\S+[\\/])?\.env(?!\.(example|sample|template))(\s|$|\.)/.test(s),
    'do not read .env files',
  ],
];

const WRITE_TOOLS = new Set(['edit', 'write', 'patch', 'multiedit']);

function isEnvFile(file) {
  const name = String(file).split(/[\\/]/).pop() || '';
  return /^\.env(\..+)?$/.test(name) && !/\.(example|sample|template)$/.test(name);
}

function check(tool, args) {
  if (tool === 'bash') {
    const command = String(args?.command ?? '');
    for (const segment of command.split(/&&|\|\||;|\n|\|/)) {
      const text = segment.trim();
      if (!text) continue;
      for (const [test, reason] of RULES) if (test(text)) return reason;
    }
    return null;
  }
  const file = args?.filePath ?? args?.path;
  if (!file) return null;
  if (tool === 'read' && isEnvFile(file)) return 'do not read .env files';
  if (WRITE_TOOLS.has(tool) && /\.git[\\/]hooks[\\/]/.test(String(file))) return 'do not modify .git/hooks';
  return null;
}

export const CoreGuard = async ({ directory, worktree }) => {
  const root = worktree || directory || process.cwd();
  return {
    'tool.execute.before': async (input, output) => {
      const reason = check(input?.tool, output?.args);
      if (reason) {
        throw new Error(`core-guard blocked this: ${reason}. Ask the user to run it themselves if it is really needed.`);
      }
    },

    'experimental.session.compacting': async (_input, output) => {
      try {
        const file = path.join(root, '.agent', 'state.md');
        if (!fs.existsSync(file)) return;
        const text = fs.readFileSync(file, 'utf8').trim().slice(0, MAX_STATE_CHARS);
        if (!text) return;
        (output.context ||= []).push(
          `## Task state from .agent/state.md\nKeep this in the summary. If it disagrees with the code, trust the code.\n\n${text}`,
        );
      } catch {
        // Never break compaction because of the state file.
      }
    },
  };
};
