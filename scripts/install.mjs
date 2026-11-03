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
const hooksRoot = path.join(repoRoot, 'githooks');
const marker = '# core-managed-hook';

function usage() {
  console.log(`Usage: node scripts/install.mjs [options]

Options:
  --project <dir>       Project directory (default: current directory)
  --scope <scope>       project | global (default: project)
  --target <target>     auto | opencode | claude | agents (default: auto)
  --mode <mode>         copy | link (default: copy)
  --with-git-hooks      Install commit-msg and pre-push hooks
  --mcp <action>        check | apply | skip (default: apply)
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
    mcp: 'apply',
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

function listSkills() {
  if (!fs.existsSync(skillsRoot)) fail(`skills directory not found: ${skillsRoot}`);
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')))
    .sort();
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

function installSkills({ project, scope, target, mode, force }) {
  const destinationRoot = targetRoot(project, scope, target);
  fs.mkdirSync(destinationRoot, { recursive: true });

  const { manifest, file: manifestFile, error: manifestError } = readManifest(destinationRoot);
  if (manifestError && !force) {
    fail(
      `cannot read ${manifestFile} (${manifestError.message}); fix it or rerun with --force`,
    );
  }

  const names = listSkills();
  const installed = [];
  const updated = [];
  const skipped = [];
  const pruned = [];

  for (const name of names) {
    const source = path.join(skillsRoot, name);
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

function writeCommitMsgWrapper(hooksDir) {
  const wrapper = `#!/bin/sh
${marker}: chain the pre-existing hook, then the core hook.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -x "$dir/commit-msg.pre-core" ]; then
  "$dir/commit-msg.pre-core" "$@" || exit $?
fi
exec "$dir/commit-msg.core" "$@"
`;
  const file = path.join(hooksDir, 'commit-msg');
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

  const sourceHooks = ['commit-msg', 'pre-push'];
  for (const name of sourceHooks) {
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
      if (name === 'commit-msg') writeCommitMsgWrapper(hooksDir);
      else writePrePushWrapper(hooksDir);
    } else {
      copyExecutable(path.join(hooksRoot, name), destination);
      fs.rmSync(path.join(hooksDir, `${name}.core`), { force: true });
    }
  }

  fs.copyFileSync(path.join(hooksRoot, 'identity'), path.join(hooksDir, 'core-identity'));
  return { status: 'installed', hooksDir };
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
      for (const name of ['commit-msg', 'pre-push']) {
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
  const mcp = runMcp(project, opts.mcp);

  printSummary({
    ...result,
    scope: opts.scope,
    target,
    mode: opts.mode,
    hooks,
    mcp,
  });
}

main();
