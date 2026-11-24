#!/usr/bin/env node
// Exercises plugins/core-guard.js without OpenCode. Exit 1 on any failure.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'core-guard-'));
const copy = path.join(tmp, 'core-guard.mjs');
fs.copyFileSync(path.join(here, '..', 'plugins', 'core-guard.js'), copy);

const exportsList = Object.keys(await import(pathToFileURL(copy).href));
let failures = 0;
const expect = (ok, label) => {
  if (!ok) {
    failures += 1;
    console.error(`FAIL: ${label}`);
  }
};
expect(exportsList.length === 1, `plugin file must have exactly one export (found ${exportsList.length})`);

const mod = await import(pathToFileURL(copy).href);
const hooks = await mod[exportsList[0]]({ directory: tmp, worktree: tmp });

const run = async (tool, args) => {
  try {
    await hooks['tool.execute.before']({ tool }, { args });
    return 'allowed';
  } catch {
    return 'blocked';
  }
};

const blockedBash = [
  'git commit -m "feat: x" --no-verify',
  'git commit -nm "feat: x"',
  'git -c core.hooksPath=/dev/null commit -m "feat: x"',
  'git push --force origin main',
  'git push -f',
  'git push --force-with-lease',
  'git push origin +main',
  'git add -A',
  'git add .',
  'git add --all',
  'git -C app add .',
  'cd app && git add .',
  'bash -c "git add ."',
  'rm .git/hooks/pre-push',
  'echo x > .git/hooks/commit-msg',
  'printenv',
  'env',
  'env | sort',
  'cat .env',
  'cat config/.env.local',
  'grep KEY .env',
  'git add .opencode',
  'git add .opencode/skills/engineering/SKILL.md',
  'git add -f .claude',
  'git add src/app.ts AGENTS.md',
  'git add CLAUDE.md',
  'git add opencode.json',
  'git add .mcp.json',
  'git add apps/web/.claude/settings.json',
  'git add ./.agents',
  'cd app && git add .cursor',
  'CORE_ALLOW_LARGE=1 git commit -m \"feat: x\"',
  'env CORE_ALLOW_AGENT_FILES=1 git commit -m \"feat: x\"',
];
const allowedBash = [
  'git status',
  'git add src/app.ts README.md',
  'git add -p',
  'git commit -m "fix(parser): reject bad input"',
  'git commit --amend --no-edit',
  'git push -u origin feat/x',
  'git push origin HEAD:refs/heads/feat/x',
  'git push --dry-run',
  'git diff --stat',
  'git log --oneline -10',
  'cat .env.example',
  'cat src/environment.ts',
  'ls .git/hooks',
  'env FOO=1 node app.js',
  'npm test',
  'git add src/agent.ts',
  'git add docs/agents-overview.md',
  'git add src/claude-client.ts',
  'git add .agentic/notes.md',
  'git status --short .opencode',
  'rg CORE_ALLOW_ README.md',
];
for (const c of blockedBash) expect((await run('bash', { command: c })) === 'blocked', `should block: ${c}`);
for (const c of allowedBash) expect((await run('bash', { command: c })) === 'allowed', `should allow: ${c}`);

// The plugin list and the hook list must stay identical.
const identity = fs.readFileSync(path.join(here, '..', 'githooks', 'identity'), 'utf8');
const hookPaths = (/^CORE_AGENT_PATHS="([^"]*)"/m.exec(identity)?.[1] ?? '').split(/\s+/).filter(Boolean);
expect(hookPaths.length > 0, 'githooks/identity must define CORE_AGENT_PATHS');
for (const name of hookPaths) {
  expect((await run('bash', { command: `git add ${name}` })) === 'blocked', `plugin must block git add ${name}`);
}

expect((await run('read', { filePath: '/p/.env' })) === 'blocked', 'should block read of .env');
expect((await run('read', { filePath: '/p/.env.production' })) === 'blocked', 'should block read of .env.production');
expect((await run('read', { filePath: '/p/.env.example' })) === 'allowed', 'should allow read of .env.example');
expect((await run('read', { filePath: '/p/src/env.ts' })) === 'allowed', 'should allow read of src/env.ts');
expect((await run('edit', { filePath: '/p/.git/hooks/pre-push' })) === 'blocked', 'should block edit of a hook');
expect((await run('edit', { filePath: '/p/src/a.ts' })) === 'allowed', 'should allow edit of source');
expect((await run('todowrite', {})) === 'allowed', 'should ignore unrelated tools');

// compaction
let out = { context: [] };
await hooks['experimental.session.compacting']({}, out);
expect(out.context.length === 0, 'no state file means nothing injected');
fs.mkdirSync(path.join(tmp, '.agent'));
fs.writeFileSync(path.join(tmp, '.agent', 'state.md'), 'goal: ship login\nnext: add tests\n');
out = { context: [] };
await hooks['experimental.session.compacting']({}, out);
expect(out.context.length === 1 && out.context[0].includes('ship login'), 'state.md is injected into compaction');
fs.writeFileSync(path.join(tmp, '.agent', 'state.md'), 'x'.repeat(10000));
out = {};
await hooks['experimental.session.compacting']({}, out);
expect(out.context?.[0].length < 3300, 'injected state is capped');

fs.rmSync(tmp, { recursive: true, force: true });
if (failures) {
  console.error(`test-plugin: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-plugin: all checks passed');
