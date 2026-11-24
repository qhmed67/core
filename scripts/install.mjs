#!/usr/bin/env node
// Portable installer for the core skills repository.
// Node 18+, no dependencies, works on Linux, macOS and Windows.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const skillsRoot = path.join(repoRoot, 'skills');
const extrasRoot = path.join(repoRoot, 'extras');
const rulesTemplate = path.join(repoRoot, 'templates', 'rules.md');
const rulesBegin = '<!-- core:begin -->';
const rulesEnd = '<!-- core:end -->';
const hooksRoot = path.join(repoRoot, 'githooks');
const pluginsRoot = path.join(repoRoot, 'plugins');
const pluginMarker = '// core-managed:';
const marker = '# core-managed-hook';
const hookNames = ['pre-commit', 'commit-msg', 'pre-push'];

function usage() {
  console.log(`Usage: node scripts/install.mjs [options]

Options:
  --project <dir>       Project directory (default: current directory)
  --scope <scope>       project | global (default: project)
  --target <target>     auto | opencode | claude | agents (default: auto)
  --mode <mode>         copy | link (default: copy)
  --with-git-hooks      Install pre-commit, commit-msg and pre-push hooks
  --extras              Also install optional skills from extras/
  --plugins <action>    apply | skip: install the OpenCode guard plugin (opencode target only)
                        (default: apply)
  --rules <action>      apply | skip: add the always-on rules block to AGENTS.md
                        (CLAUDE.md for the claude target) (default: apply)
  --mcp <action>        check | apply | skip (default: check; no server is required)
  --force               Replace conflicting skills and chain existing hooks
  --help                Show this message

Global targets:
  opencode  ~/.config/opencode/skills
  claude    ~/.claude/skills
  agents    ~/.agents/skills
`);
}

function fail(message) {
  console.error(`install: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    project: process.cwd(),
    scope: 'project',
    target: 'auto',
    mode: 'copy',
    withGitHooks: false,
    extras: false,
    plugins: 'apply',
    rules: 'apply',
    mcp: 'check',
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [key, inline] = arg.includes('=') ? arg.split(/=(.*)/s, 2) : [arg, undefined];
    const value = () => {
      if (inline !== undefined) return inline;
      i += 1;
      if (i >= argv.length) fail(`missing value for ${key}`);
      return argv[i];
    };

    if (key === '--help' || key === '-h') {
      usage();
      process.exit(0);
    } else if (key === '--project') {
      opts.project = value();
    } else if (key === '--scope') {
      opts.scope = value();
    } else if (key === '--target') {
      opts.target = value();
    } else if (key === '--mode') {
      opts.mode = value();
    } else if (key === '--with-git-hooks') {
      opts.withGitHooks = true;
    } else if (key === '--extras') {
      opts.extras = true;
    } else if (key === '--plugins') {
      opts.plugins = value();
    } else if (key === '--rules') {
      opts.rules = value();
    } else if (key === '--mcp') {
      opts.mcp = value();
    } else if (key === '--force') {
      opts.force = true;
    } else {
      fail(`unknown option ${arg}`);
    }
  }

  if (!['project', 'global'].includes(opts.scope)) fail('--scope must be project or global');
  if (!['auto', 'opencode', 'claude', 'agents'].includes(opts.target)) {
    fail('--target must be auto, opencode, claude or agents');
  }
  if (!['copy', 'link'].includes(opts.mode)) fail('--mode must be copy or link');
  if (!['check', 'apply', 'skip'].includes(opts.mcp)) fail('--mcp must be check, apply or skip');
  if (!['apply', 'skip'].includes(opts.rules)) fail('--rules must be apply or skip');
  if (!['apply', 'skip'].includes(opts.plugins)) fail('--plugins must be apply or skip');

  return opts;
}

function expandHome(input) {
  if (input === '~') return os.homedir();
  if (input.startsWith('~/') || input.startsWith('~\\')) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function targetRoot(project, scope, target) {
  if (scope === 'global') {
    const home = os.homedir();
    if (target === 'opencode') return path.join(home, '.config', 'opencode', 'skills');
    if (target === 'claude') return path.join(home, '.claude', 'skills');
    return path.join(home, '.agents', 'skills');
  }

  if (target === 'opencode') return path.join(project, '.opencode', 'skills');
  if (target === 'claude') return path.join(project, '.claude', 'skills');
  return path.join(project, '.agents', 'skills');
}

function detectTarget(project, scope) {
  if (scope === 'global') {
    const home = os.homedir();
    if (fs.existsSync(path.join(home, '.config', 'opencode'))) return 'opencode';
    if (fs.existsSync(path.join(home, '.claude'))) return 'claude';
    return 'agents';
  }

  if (
    fs.existsSync(path.join(project, '.opencode')) ||
    fs.existsSync(path.join(project, 'opencode.json')) ||
    fs.existsSync(path.join(project, 'opencode.jsonc'))
  ) {
    return 'opencode';
  }
  if (fs.existsSync(path.join(project, '.claude'))) return 'claude';
  return 'agents';
}

function listSkillsIn(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(root, name, 'SKILL.md')))
    .sort();
}

// Returns Map<name, sourceDir>. extras/ is included only on request.
function listSkills(includeExtras) {
  if (!fs.existsSync(skillsRoot)) fail(`skills directory not found: ${skillsRoot}`);
  const map = new Map();
  for (const name of listSkillsIn(skillsRoot)) map.set(name, path.join(skillsRoot, name));
  if (includeExtras) {
    for (const name of listSkillsIn(extrasRoot)) {
      if (map.has(name)) fail(`skill "${name}" exists in both skills/ and extras/`);
      map.set(name, path.join(extrasRoot, name));
    }
  }
  return map;
}

function readManifest(target) {
  const file = path.join(target, '.core-manifest.json');
  if (!fs.existsSync(file)) return { manifest: null, file };
  try {
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!manifest || !Array.isArray(manifest.skills)) throw new Error('missing skills array');
    return { manifest, file };
  } catch (error) {
    return { manifest: null, file, error };
  }
}

function isCoreOwned(manifest, name) {
  return Boolean(manifest && Array.isArray(manifest.skills) && manifest.skills.includes(name));
}

function copySkill(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true, dereference: false });
}

function linkSkill(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.symlinkSync(source, destination, process.platform === 'win32' ? 'junction' : 'dir');
}

function coreCommit() {
  const result = spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) return 'unknown';
  return result.stdout.trim() || 'unknown';
}

function installSkills({ project, scope, target, mode, force, extras }) {
  const destinationRoot = targetRoot(project, scope, target);
  fs.mkdirSync(destinationRoot, { recursive: true });

  const { manifest, file: manifestFile, error: manifestError } = readManifest(destinationRoot);
  if (manifestError && !force) {
    fail(
      `cannot read ${manifestFile} (${manifestError.message}); fix it or rerun with --force`,
    );
  }

  const skillMap = listSkills(extras);
  const names = [...skillMap.keys()].sort();
  const installed = [];
  const updated = [];
  const skipped = [];
  const pruned = [];

  for (const name of names) {
    const source = skillMap.get(name);
    const destination = path.join(destinationRoot, name);
    const existed = fs.existsSync(destination) || fs.lstatSync(destination, { throwIfNoEntry: false }) !== undefined;

    if (existed && !isCoreOwned(manifest, name) && !force) {
      console.warn(`install: skipping ${name}; it already exists and is not core-owned (use --force to replace)`);
      skipped.push(name);
      continue;
    }

    if (mode === 'link') {
      linkSkill(source, destination);
    } else {
      copySkill(source, destination);
    }

    if (existed) updated.push(name);
    else installed.push(name);
  }

  // Remove core-owned skills that no longer exist in this repository.
  if (manifest) {
    for (const name of manifest.skills) {
      if (names.includes(name)) continue;
      const destination = path.join(destinationRoot, name);
      if (fs.existsSync(destination)) {
        fs.rmSync(destination, { recursive: true, force: true });
        pruned.push(name);
      }
    }
  }

  const installedNow = names.filter((name) => !skipped.includes(name));
  const nextManifest = {
    tool: 'core',
    version: 1,
    source: repoRoot,
    commit: coreCommit(),
    installedAt: new Date().toISOString(),
    mode,
    skills: installedNow,
  };
  fs.writeFileSync(manifestFile, `${JSON.stringify(nextManifest, null, 2)}\n`);

  return { destinationRoot, installed, updated, skipped, pruned, manifestFile, count: installedNow.length };
}

function hookIsOurs(file) {
  try {
    return fs.readFileSync(file, 'utf8').includes(marker);
  } catch {
    return false;
  }
}

function copyExecutable(source, destination) {
  fs.copyFileSync(source, destination);
  try {
    fs.chmodSync(destination, 0o755);
  } catch {
    // Windows has no executable bit; Git for Windows runs .git/hooks directly.
  }
}

function writeChainWrapper(hooksDir, name) {
  const wrapper = `#!/bin/sh
${marker}: chain the pre-existing hook, then the core hook.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -x "$dir/${name}.pre-core" ]; then
  "$dir/${name}.pre-core" "$@" || exit $?
fi
exec "$dir/${name}.core" "$@"
`;
  const file = path.join(hooksDir, name);
  fs.writeFileSync(file, wrapper);
  fs.chmodSync(file, 0o755);
}

function writePrePushWrapper(hooksDir) {
  const wrapper = `#!/bin/sh
${marker}: chain the pre-existing hook, then the core hook.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
tmp=$(mktemp 2>/dev/null) || exit 1
cat > "$tmp"
if [ -x "$dir/pre-push.pre-core" ]; then
  "$dir/pre-push.pre-core" "$@" < "$tmp"
  rc=$?
  rm -f "$tmp"
  [ "$rc" -eq 0 ] || exit "$rc"
fi
"$dir/pre-push.core" "$@" < "$tmp"
rc=$?
rm -f "$tmp"
exit "$rc"
`;
  const file = path.join(hooksDir, 'pre-push');
  fs.writeFileSync(file, wrapper);
  fs.chmodSync(file, 0o755);
}

function installHooks(project, force) {
  const gitDirResult = spawnSync('git', ['-C', project, 'rev-parse', '--git-dir'], {
    encoding: 'utf8',
  });
  if (gitDirResult.status !== 0) {
    console.warn('install: --with-git-hooks skipped; the project is not a git repository');
    return { status: 'skipped', reason: 'not a git repository' };
  }

  const gitDir = path.resolve(project, gitDirResult.stdout.trim());
  const hooksDir = path.join(gitDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });

  for (const name of hookNames) {
    const destination = path.join(hooksDir, name);
    const existing = fs.lstatSync(destination, { throwIfNoEntry: false });

    if (existing && !hookIsOurs(destination)) {
      if (!force) {
        fail(
          `existing hook at ${destination}; move it aside or rerun with --force to chain it`,
        );
      }
      const backup = path.join(hooksDir, `${name}.pre-core`);
      if (fs.existsSync(backup)) {
        fs.rmSync(backup, { force: true });
      }
      fs.renameSync(destination, backup);
    }

    const chained = fs.existsSync(path.join(hooksDir, `${name}.pre-core`));
    if (chained) {
      copyExecutable(path.join(hooksRoot, name), path.join(hooksDir, `${name}.core`));
      if (name === 'pre-push') writePrePushWrapper(hooksDir);
      else writeChainWrapper(hooksDir, name);
    } else {
      copyExecutable(path.join(hooksRoot, name), destination);
      fs.rmSync(path.join(hooksDir, `${name}.core`), { force: true });
    }
  }

  fs.copyFileSync(path.join(hooksRoot, 'identity'), path.join(hooksDir, 'core-identity'));
  return { status: 'installed', hooksDir };
}

function rulesFile(project, scope, target) {
  if (scope === 'global') {
    const home = os.homedir();
    if (target === 'claude') return path.join(home, '.claude', 'CLAUDE.md');
    if (target === 'opencode') return path.join(home, '.config', 'opencode', 'AGENTS.md');
    return null;
  }
  const agents = path.join(project, 'AGENTS.md');
  if (target === 'claude') {
    const claude = path.join(project, 'CLAUDE.md');
    // A CLAUDE.md that imports AGENTS.md already carries the block through it.
    if (fs.existsSync(claude) && /^@AGENTS\.md\s*$/m.test(fs.readFileSync(claude, 'utf8'))) return agents;
    return claude;
  }
  return agents;
}

function applyRules(project, scope, target) {
  const file = rulesFile(project, scope, target);
  if (!file) return { status: 'skipped', reason: 'no rules file for this target' };
  if (!fs.existsSync(rulesTemplate)) return { status: 'skipped', reason: 'templates/rules.md missing' };

  const block = fs.readFileSync(rulesTemplate, 'utf8').trim();
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const begin = current.indexOf(rulesBegin);
  const end = current.indexOf(rulesEnd);

  let next;
  if (begin !== -1 && end > begin) {
    next = current.slice(0, begin) + block + current.slice(end + rulesEnd.length);
  } else {
    next = current.length ? `${current.replace(/\s+$/, '')}\n\n${block}` : block;
  }
  if (!next.endsWith('\n')) next += '\n';

  if (next === current) return { status: 'unchanged', file };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, next);
  return { status: current ? 'updated' : 'created', file };
}

function pluginsDir(project, scope) {
  return scope === 'global'
    ? path.join(os.homedir(), '.config', 'opencode', 'plugins')
    : path.join(project, '.opencode', 'plugins');
}

// OpenCode loads every .js file in its plugins directory. Install only files
// that carry the core marker, and never replace a foreign file without --force.
function installPlugins(project, scope, target, force) {
  if (target !== 'opencode') return { status: 'skipped', reason: 'plugins are for the opencode target' };
  if (!fs.existsSync(pluginsRoot)) return { status: 'skipped', reason: 'plugins/ missing' };

  const dir = pluginsDir(project, scope);
  const installed = [];
  const skipped = [];
  for (const name of fs.readdirSync(pluginsRoot).filter((f) => f.endsWith('.js')).sort()) {
    const source = path.join(pluginsRoot, name);
    const destination = path.join(dir, name);
    if (fs.existsSync(destination)) {
      const current = fs.readFileSync(destination, 'utf8');
      if (!current.startsWith(pluginMarker) && !force) {
        skipped.push(name);
        continue;
      }
      if (current === fs.readFileSync(source, 'utf8')) continue;
    }
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(source, destination);
    installed.push(name);
  }
  return { status: 'ok', dir, installed, skipped };
}

// Agent and tool paths come from CORE_AGENT_PATHS in githooks/identity, the
// same list the pre-commit hook and the guard plugin use.
function agentPaths() {
  const file = path.join(hooksRoot, 'identity');
  const match = fs.existsSync(file) ? /^CORE_AGENT_PATHS="([^"]*)"/m.exec(fs.readFileSync(file, 'utf8')) : null;
  const names = match ? match[1].split(/\s+/).filter(Boolean) : [];
  return ['.agent', ...names.filter((name) => name !== '.agent')];
}

// Keep agent files and session state out of git without touching tracked
// files. .git/info/exclude is local to this clone and is never committed.
function ensureAgentExcluded(project, scope) {
  if (scope !== 'project') return { status: 'skipped', reason: 'global scope' };
  const result = spawnSync('git', ['-C', project, 'rev-parse', '--git-dir'], { encoding: 'utf8' });
  if (result.status !== 0) return { status: 'skipped', reason: 'not a git repository' };
  const file = path.join(path.resolve(project, result.stdout.trim()), 'info', 'exclude');
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = new Set(current.split(/\r?\n/).map((line) => line.trim()));
  // A bare dot-name is a directory (.claude); anything with an extension is a file.
  const wanted = agentPaths().map((name) => (/^\.[A-Za-z0-9_-]+$/.test(name) ? `${name}/` : name));
  const added = wanted.filter((line) => !lines.has(line) && !lines.has(line.replace(/\/$/, '')));
  if (added.length === 0) return { status: 'unchanged', file, added };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const prefix = current && !current.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(file, `${current}${prefix}${added.join('\n')}\n`);
  return { status: 'added', file, added };
}

function runMcp(project, action) {
  if (action === 'skip') return { status: 'skipped' };
  const script = path.join(repoRoot, 'scripts', 'ensure-mcp.mjs');
  const args = [script, action === 'check' ? '--check' : '--apply', '--project', project];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) {
    console.warn(`install: MCP ${action} could not run: ${result.error.message}`);
    return { status: 'error' };
  }
  return { status: result.status === 0 ? 'ok' : 'attention', code: result.status };
}

function printSummary(summary) {
  console.log('');
  console.log(`Target:   ${summary.destinationRoot} (${summary.scope}, ${summary.target})`);
  console.log(`Mode:     ${summary.mode}`);
  console.log(`Skills:   ${summary.count} installed (${summary.installed.length} new, ${summary.updated.length} updated)`);
  if (summary.skipped.length) console.log(`Skipped:  ${summary.skipped.join(', ')}`);
  if (summary.pruned.length) console.log(`Pruned:   ${summary.pruned.join(', ')}`);
  console.log(`Manifest: ${summary.manifestFile}`);
  if (summary.hooks) {
    console.log(
      summary.hooks.status === 'installed'
        ? `Hooks:    installed in ${summary.hooks.hooksDir}`
        : `Hooks:    ${summary.hooks.status} (${summary.hooks.reason || ''})`,
    );
  }
  if (summary.rules) {
    console.log(
      summary.rules.file
        ? `Rules:    ${summary.rules.status} (${summary.rules.file})`
        : `Rules:    ${summary.rules.status} (${summary.rules.reason || ''})`,
    );
  }
  if (summary.plugins) {
    if (summary.plugins.status === 'ok') {
      const parts = [];
      if (summary.plugins.installed.length) parts.push(`installed ${summary.plugins.installed.join(', ')}`);
      if (summary.plugins.skipped.length) parts.push(`skipped foreign ${summary.plugins.skipped.join(', ')}`);
      console.log(`Plugins:  ${parts.join('; ') || 'unchanged'} (${summary.plugins.dir})`);
    } else {
      console.log(`Plugins:  ${summary.plugins.status} (${summary.plugins.reason || ''})`);
    }
  }
  if (summary.exclude && summary.exclude.status === 'added') {
    console.log(`Exclude:  ${summary.exclude.added.length} agent path(s) added to ${summary.exclude.file}`);
  }
  if (summary.mcp) {
    const label = summary.mcp.status === 'ok'
      ? 'ok'
      : summary.mcp.status === 'attention'
        ? 'missing servers; review the output above'
        : summary.mcp.status;
    console.log(`MCP:      ${label}`);
  }
  console.log('');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const project = path.resolve(expandHome(opts.project));
  if (!fs.existsSync(project)) fail(`project directory does not exist: ${project}`);
  if (!fs.statSync(project).isDirectory()) fail(`project path is not a directory: ${project}`);

  const target = opts.target === 'auto' ? detectTarget(project, opts.scope) : opts.target;

  // Validate hook conflicts before writing skills so a refusal leaves no
  // half-installed state.
  if (opts.withGitHooks) {
    const gitDirResult = spawnSync('git', ['-C', project, 'rev-parse', '--git-dir'], {
      encoding: 'utf8',
    });
    if (gitDirResult.status === 0) {
      const gitDir = path.resolve(project, gitDirResult.stdout.trim());
      for (const name of hookNames) {
        const hook = path.join(gitDir, 'hooks', name);
        if (fs.existsSync(hook) && !hookIsOurs(hook) && !opts.force) {
          fail(
            `existing hook at ${hook}; move it aside or rerun with --force to chain it`,
          );
        }
      }
    }
  }

  const result = installSkills({ ...opts, project, target });
  const hooks = opts.withGitHooks ? installHooks(project, opts.force) : null;
  const rules = opts.rules === 'apply' ? applyRules(project, opts.scope, target) : null;
  const plugins = opts.plugins === 'apply' ? installPlugins(project, opts.scope, target, opts.force) : null;
  const exclude = ensureAgentExcluded(project, opts.scope);
  const mcp = runMcp(project, opts.mcp);

  printSummary({
    ...result,
    scope: opts.scope,
    target,
    mode: opts.mode,
    hooks,
    rules,
    plugins,
    exclude,
    mcp,
  });
}

main();
