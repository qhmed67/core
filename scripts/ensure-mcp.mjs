#!/usr/bin/env node
// Check, add or remove MCP servers. The default baseline is empty: browser
// work goes through playwright-cli (skills/engineering/WEB.md), because an MCP
// server loads its tool schemas into every session. Servers are added only on
// request (--servers); --remove deletes them and keeps a backup. A configured Playwright MCP or a Firecrawl without its
// key is reported as a warning. Node 18+, no dependencies. Supports OpenCode v1
// and v2 config shapes and Claude Code's .mcp.json. Never writes secrets.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const KNOWN_SERVERS = ['playwright', 'firecrawl'];

function usage() {
  console.log(`Usage: node scripts/ensure-mcp.mjs [--check|--apply|--remove] [options]

Options:
  --check               Report configured servers and warnings (default)
  --apply               Add only the missing servers named by --servers
  --remove              Delete playwright and firecrawl entries (or those named by
                        --servers). Saves a backup first
  --servers <list>      Comma list from: playwright, firecrawl (default: none;
                        --remove defaults to both)
  --file <path>         Use this config file instead of the project one. Needs
                        --target opencode or claude. For a global config such as
                        ~/.claude.json or ~/.config/opencode/opencode.json
  --project <dir>       Project directory (default: current directory)
  --target <target>     auto | opencode | claude (default: auto)
  --help                Show this message

Exit codes: 0 nothing missing, 1 a requested server is missing, 2 parse or configuration error.
`);
}

function parseArgs(argv) {
  const opts = { action: 'check', project: process.cwd(), target: 'auto', servers: [], file: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [key, inline] = arg.includes('=') ? arg.split(/=(.*)/s, 2) : [arg, undefined];
    const value = () => {
      if (inline !== undefined) return inline;
      i += 1;
      if (i >= argv.length) throw new Error(`missing value for ${key}`);
      return argv[i];
    };
    if (key === '--help' || key === '-h') {
      usage();
      process.exit(0);
    } else if (key === '--check') {
      opts.action = 'check';
    } else if (key === '--apply') {
      opts.action = 'apply';
    } else if (key === '--remove') {
      opts.action = 'remove';
    } else if (key === '--file') {
      opts.file = value();
    } else if (key === '--project') {
      opts.project = value();
    } else if (key === '--target') {
      opts.target = value();
    } else if (key === '--servers') {
      opts.servers = value().split(',').map((name) => name.trim()).filter(Boolean);
    } else {
      throw new Error(`unknown option ${arg}`);
    }
  }
  if (!['auto', 'opencode', 'claude'].includes(opts.target)) {
    throw new Error('--target must be auto, opencode or claude');
  }
  if (opts.file && opts.target === 'auto') throw new Error('--file needs --target opencode or claude');
  for (const name of opts.servers) {
    if (!KNOWN_SERVERS.includes(name)) throw new Error(`unknown server ${name}; use playwright or firecrawl`);
  }
  return opts;
}

function stripJsonc(text) {
  let out = '';
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let hasComments = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const n = text[i + 1];

    if (lineComment) {
      if (c === '\n') {
        lineComment = false;
        out += c;
      }
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') {
        blockComment = false;
        i += 1;
      } else if (c === '\n') {
        out += c;
      }
      continue;
    }
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === '/' && n === '/') {
      hasComments = true;
      lineComment = true;
      i += 1;
      continue;
    }
    if (c === '/' && n === '*') {
      hasComments = true;
      blockComment = true;
      i += 1;
      continue;
    }
    out += c;
  }

  return { text: removeTrailingCommas(out), hasComments };
}

function removeTrailingCommas(text) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j += 1;
      if (text[j] === '}' || text[j] === ']') continue;
    }
    out += c;
  }
  return out;
}

function readJsonConfig(file) {
  if (!fs.existsSync(file)) return { exists: false, data: null, hasComments: false };
  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.trim()) return { exists: true, data: {}, hasComments: false, empty: true };
  const { text, hasComments } = stripJsonc(raw);
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`cannot safely parse ${file}: ${error.message}`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`cannot safely parse ${file}: top level must be an object`);
  }
  return { exists: true, data, hasComments };
}

function findOpenCodeConfig(project) {
  const candidates = [
    path.join(project, '.opencode', 'opencode.jsonc'),
    path.join(project, '.opencode', 'opencode.json'),
    path.join(project, 'opencode.jsonc'),
    path.join(project, 'opencode.json'),
  ];
  return candidates.find((file) => fs.existsSync(file)) || null;
}

function defaultOpenCodeConfig(project) {
  if (fs.existsSync(path.join(project, '.opencode'))) {
    return path.join(project, '.opencode', 'opencode.json');
  }
  return path.join(project, 'opencode.json');
}

function opencodeMajor() {
  const result = spawnSync('opencode', ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) return null;
  const match = /(?:^|\s)v?(\d+)(?:\.|$)/.exec(String(result.stdout || '').trim());
  return match ? Number(match[1]) : null;
}

function detectShape(data, file) {
  if (data && data.mcp && typeof data.mcp === 'object' && !Array.isArray(data.mcp)) {
    if (data.mcp.servers && typeof data.mcp.servers === 'object') return 'v2';
    const keys = Object.keys(data.mcp).filter((key) => key !== 'servers' && key !== 'timeout');
    if (keys.length > 0) return 'v1';
    if (Object.prototype.hasOwnProperty.call(data.mcp, 'servers')) return 'v2';
  }
  const major = opencodeMajor();
  if (major === 1) return 'v1';
  if (major !== null && major >= 2) return 'v2';
  return file.endsWith('.jsonc') ? 'v2' : 'v2';
}

function validateContainer(data, kind, shape, file) {
  if (kind === 'claude') {
    if (Object.prototype.hasOwnProperty.call(data, 'mcpServers')) {
      const value = data.mcpServers;
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${file}: mcpServers must be an object`);
      }
    }
    return;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'mcp')) {
    const value = data.mcp;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${file}: mcp must be an object`);
    }
    if (shape === 'v2' && Object.prototype.hasOwnProperty.call(value, 'servers')) {
      const servers = value.servers;
      if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
        throw new Error(`${file}: mcp.servers must be an object`);
      }
    }
  }
}

function entriesFor(data, kind, shape, file) {
  validateContainer(data, kind, shape, file);
  if (kind === 'claude') return data.mcpServers || {};
  if (shape === 'v1') return data.mcp || {};
  return (data.mcp && data.mcp.servers) || {};
}

function ensureContainer(data, kind, shape, file) {
  validateContainer(data, kind, shape, file);
  if (kind === 'claude') {
    if (!data.mcpServers || typeof data.mcpServers !== 'object' || Array.isArray(data.mcpServers)) {
      data.mcpServers = {};
    }
    return data.mcpServers;
  }
  if (!data.mcp || typeof data.mcp !== 'object' || Array.isArray(data.mcp)) data.mcp = {};
  if (shape === 'v1') return data.mcp;
  if (!data.mcp.servers || typeof data.mcp.servers !== 'object' || Array.isArray(data.mcp.servers)) {
    data.mcp.servers = {};
  }
  return data.mcp.servers;
}

function commandString(entry, kind) {
  if (!entry || typeof entry !== 'object') return '';
  const parts = [];
  if (Array.isArray(entry.command)) parts.push(...entry.command.map(String));
  else if (typeof entry.command === 'string') parts.push(entry.command);
  if (kind === 'claude' && Array.isArray(entry.args)) parts.push(...entry.args.map(String));
  if (typeof entry.url === 'string') parts.push(entry.url);
  return parts.join(' ');
}

function matches(entry, server, kind) {
  const text = commandString(entry, kind);
  if (server === 'playwright') {
    return /@playwright\/mcp\b/.test(text) || /\bplaywright-mcp\b/.test(text) || /playwright/i.test(text);
  }
  return /\bfirecrawl-mcp\b/.test(text) || /firecrawl/i.test(text);
}

function disabled(entry, kind, shape) {
  if (!entry || typeof entry !== 'object') return false;
  if (shape === 'v1') return entry.enabled === false;
  if (shape === 'v2') return entry.disabled === true;
  return false;
}

function findServer(entries, server, kind) {
  for (const [key, entry] of Object.entries(entries)) {
    if (matches(entry, server, kind)) return { key, entry };
  }
  return null;
}

function uniqueKey(entries, base) {
  if (!Object.prototype.hasOwnProperty.call(entries, base)) return base;
  const fallback = `${base}-baseline`;
  if (!Object.prototype.hasOwnProperty.call(entries, fallback)) return fallback;
  let index = 2;
  while (Object.prototype.hasOwnProperty.call(entries, `${fallback}-${index}`)) index += 1;
  return `${fallback}-${index}`;
}

function baselineEntries(kind, shape) {
  if (kind === 'claude') {
    return {
      playwright: {
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      },
      firecrawl: {
        command: 'npx',
        args: ['-y', 'firecrawl-mcp'],
        env: { FIRECRAWL_API_KEY: '${FIRECRAWL_API_KEY}' },
      },
    };
  }
  if (shape === 'v1') {
    return {
      playwright: {
        type: 'local',
        command: ['npx', '@playwright/mcp@latest'],
        enabled: true,
      },
      firecrawl: {
        type: 'local',
        command: ['npx', '-y', 'firecrawl-mcp'],
        enabled: true,
        environment: { FIRECRAWL_API_KEY: '{env:FIRECRAWL_API_KEY}' },
      },
    };
  }
  return {
    playwright: {
      type: 'local',
      command: ['npx', '@playwright/mcp@latest'],
    },
    firecrawl: {
      type: 'local',
      command: ['npx', '-y', 'firecrawl-mcp'],
      environment: { FIRECRAWL_API_KEY: '{env:FIRECRAWL_API_KEY}' },
    },
  };
}

function collectTargets(project, target, file) {
  if (file) return [{ kind: target, file: path.resolve(file) }];
  const opencodeFile = findOpenCodeConfig(project) || defaultOpenCodeConfig(project);
  const claudeFile = path.join(project, '.mcp.json');

  if (target === 'opencode') return [{ kind: 'opencode', file: opencodeFile }];
  if (target === 'claude') return [{ kind: 'claude', file: claudeFile }];

  const hasOpenCode =
    Boolean(findOpenCodeConfig(project)) || fs.existsSync(path.join(project, '.opencode'));
  const hasClaude = fs.existsSync(path.join(project, '.claude')) || fs.existsSync(claudeFile);

  if (hasOpenCode && hasClaude) {
    return [
      { kind: 'opencode', file: opencodeFile },
      { kind: 'claude', file: claudeFile },
    ];
  }
  if (hasOpenCode) return [{ kind: 'opencode', file: opencodeFile }];
  if (hasClaude) return [{ kind: 'claude', file: claudeFile }];
  return [opencodeMajor() !== null
    ? { kind: 'opencode', file: opencodeFile }
    : { kind: 'claude', file: claudeFile }];
}

function label(kind, shape) {
  return kind === 'claude' ? 'Claude .mcp.json' : `OpenCode ${shape || 'config'}`;
}

function inspectTarget(project, target, wanted) {
  const loaded = readJsonConfig(target.file);
  if (target.kind === 'claude' && loaded.hasComments) {
    throw new Error(`${target.file}: comments are not valid in .mcp.json`);
  }
  if (!loaded.exists) {
    return { ...target, exists: false, shape: null, missing: [...wanted], present: [] };
  }
  const shape = target.kind === 'claude' ? null : detectShape(loaded.data, target.file);
  const entries = entriesFor(loaded.data, target.kind, shape, target.file);
  const present = [];
  const missing = [];
  for (const server of KNOWN_SERVERS) {
    const found = findServer(entries, server, target.kind);
    if (found) {
      present.push({
        server,
        key: found.key,
        inactive: disabled(found.entry, target.kind, shape),
      });
    } else if (wanted.includes(server)) {
      missing.push(server);
    }
  }
  return { ...target, exists: true, shape, hasComments: loaded.hasComments, present, missing };
}

function warningFor(item) {
  if (item.inactive) return null;
  if (item.server === 'playwright') {
    return 'loads its tool schemas every session and returns page trees into the context; prefer playwright-cli (skills/engineering/WEB.md)';
  }
  if (item.server === 'firecrawl' && !process.env.FIRECRAWL_API_KEY) {
    return 'FIRECRAWL_API_KEY is not set in this shell, so every call will fail';
  }
  return null;
}

function check(opts, project) {
  const targets = collectTargets(project, opts.target, opts.file);
  let missingCount = 0;
  let parseError = false;

  console.log(`MCP check: ${project}`);
  for (const target of targets) {
    let result;
    try {
      result = inspectTarget(project, target, opts.servers);
    } catch (error) {
      console.error(`ensure-mcp: ${error.message}`);
      console.error('ensure-mcp: fix the file or edit it manually; nothing was changed.');
      parseError = true;
      continue;
    }

    console.log(`\n${label(target.kind, result.shape)}: ${target.file}`);
    if (!result.exists) {
      if (opts.servers.length > 0) {
        console.log('  config missing; --apply would create it');
        missingCount += opts.servers.length;
      } else {
        console.log('  no config file; nothing required');
      }
      continue;
    }
    if (result.hasComments) {
      console.log('  note: JSONC comments detected; --apply will not rewrite this file');
    }
    for (const item of result.present) {
      console.log(
        `  ${item.server}: present (key: ${item.key})${item.inactive ? ' - disabled' : ''}`,
      );
      const warning = warningFor(item);
      if (warning) console.log(`    warning: ${warning}`);
      if (item.inactive && opts.servers.includes(item.server)) missingCount += 1;
    }
    for (const server of result.missing) {
      console.log(`  ${server}: MISSING`);
      missingCount += 1;
    }
  }

  if (parseError) return 2;
  if (opts.servers.length === 0) {
    console.log('\nResult: no server is required. Browser work uses playwright-cli.');
    return 0;
  }
  if (missingCount > 0) {
    console.log(`\nResult: ${missingCount} requested server(s) missing.`);
    return 1;
  }
  console.log('\nResult: requested servers present.');
  return 0;
}

function apply(opts, project) {
  if (opts.servers.length === 0) {
    console.log('ensure-mcp: no servers requested (use --servers playwright,firecrawl); nothing to add.');
    return 0;
  }
  const targets = collectTargets(project, opts.target, opts.file);
  let addedTotal = 0;
  let presentTotal = 0;
  let enabledTotal = 0;
  let changedFiles = 0;
  const prepared = [];

  // Parse and validate every target before writing any of them, so a bad file
  // cannot leave a half-applied configuration behind.
  for (const target of targets) {
    let loaded;
    try {
      loaded = readJsonConfig(target.file);
    } catch (error) {
      console.error(`ensure-mcp: ${error.message}`);
      console.error('ensure-mcp: edit the file manually; nothing was changed.');
      return 2;
    }

    if (loaded.hasComments) {
      if (target.kind === 'claude') {
        console.error(`ensure-mcp: ${target.file} contains comments, which .mcp.json does not allow.`);
      } else {
        console.error(`ensure-mcp: ${target.file} contains JSONC comments.`);
        console.error('ensure-mcp: edit it manually so comments are not lost; nothing was changed.');
      }
      return 2;
    }

    const data = loaded.data || {};
    const shape = target.kind === 'claude'
      ? null
      : detectShape(data, target.file);
    try {
      validateContainer(data, target.kind, shape, target.file);
    } catch (error) {
      console.error(`ensure-mcp: ${error.message}`);
      console.error('ensure-mcp: edit the file manually; nothing was changed.');
      return 2;
    }
    prepared.push({ target, loaded, data, shape });
  }

  for (const { target, loaded, data, shape } of prepared) {
    const entries = ensureContainer(data, target.kind, shape, target.file);
    const baseline = baselineEntries(target.kind, shape);
    const added = [];
    const enabled = [];

    for (const server of opts.servers) {
      const found = findServer(entries, server, target.kind);
      if (found) {
        if (disabled(found.entry, target.kind, shape) && target.kind === 'opencode') {
          if (shape === 'v1') found.entry.enabled = true;
          else found.entry.disabled = false;
          enabled.push(`${found.key} (${server})`);
          enabledTotal += 1;
        } else {
          presentTotal += 1;
        }
        continue;
      }
      const key = uniqueKey(entries, server);
      entries[key] = baseline[server];
      added.push(`${key} (${server})`);
      addedTotal += 1;
    }

    if (!loaded.exists && target.kind === 'opencode') {
      data.$schema = 'https://opencode.ai/config.json';
    }

    if (added.length > 0 || enabled.length > 0 || !loaded.exists) {
      fs.mkdirSync(path.dirname(target.file), { recursive: true });
      fs.writeFileSync(target.file, `${JSON.stringify(data, null, 2)}\n`);
      changedFiles += 1;
    }

    console.log(`${label(target.kind, shape)}: ${target.file}`);
    if (added.length) console.log(`  added: ${added.join(', ')}`);
    if (enabled.length) console.log(`  enabled: ${enabled.join(', ')}`);
    if (!added.length && !enabled.length) console.log('  already complete');
  }

  if (opts.servers.includes('firecrawl')) {
    const keySet = process.env.FIRECRAWL_API_KEY ? 'set' : 'not set';
    console.log(`\nFIRECRAWL_API_KEY: ${keySet}`);
    if (!process.env.FIRECRAWL_API_KEY) {
      console.log('Export FIRECRAWL_API_KEY in the shell that starts the agent before using firecrawl.');
    }
  }
  console.log(
    `Result: ${addedTotal} server(s) added, ${enabledTotal} enabled, ${presentTotal} already present, ${changedFiles} file(s) written.`,
  );
  return 0;
}

// A backup of a project file goes under .agent/ so a commit cannot pick it up.
function backupPath(file, project) {
  const inside = path.relative(project, file);
  if (!inside.startsWith('..') && !path.isAbsolute(inside)) {
    return path.join(project, '.agent', 'mcp-backup', `${path.basename(file)}.bak`);
  }
  return `${file}.core-bak`;
}

function remove(opts, project) {
  const servers = opts.servers.length > 0 ? opts.servers : KNOWN_SERVERS;
  const targets = collectTargets(project, opts.target, opts.file);
  const prepared = [];

  // Parse every target first so a bad file cannot leave a half-cleaned setup.
  for (const target of targets) {
    let loaded;
    try {
      loaded = readJsonConfig(target.file);
    } catch (error) {
      console.error(`ensure-mcp: ${error.message}`);
      console.error('ensure-mcp: edit the file manually; nothing was changed.');
      return 2;
    }
    if (!loaded.exists) continue;
    if (loaded.hasComments) {
      console.error(`ensure-mcp: ${target.file} contains comments; remove the entries by hand so they are not lost. Nothing was changed.`);
      return 2;
    }
    const shape = target.kind === 'claude' ? null : detectShape(loaded.data, target.file);
    try {
      validateContainer(loaded.data, target.kind, shape, target.file);
    } catch (error) {
      console.error(`ensure-mcp: ${error.message}`);
      console.error('ensure-mcp: edit the file manually; nothing was changed.');
      return 2;
    }
    prepared.push({ target, loaded, shape });
  }

  let removedTotal = 0;
  for (const { target, loaded, shape } of prepared) {
    const entries = entriesFor(loaded.data, target.kind, shape, target.file);
    const removed = [];
    for (const server of servers) {
      for (;;) {
        const found = findServer(entries, server, target.kind);
        if (!found) break;
        delete entries[found.key];
        removed.push(`${found.key} (${server})`);
      }
    }
    console.log(`${label(target.kind, shape)}: ${target.file}`);
    if (removed.length === 0) {
      console.log('  nothing to remove');
      continue;
    }
    const backup = backupPath(target.file, project);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(target.file, backup);
    fs.writeFileSync(target.file, `${JSON.stringify(loaded.data, null, 2)}\n`);
    console.log(`  removed: ${removed.join(', ')}`);
    console.log(`  backup: ${backup}`);
    removedTotal += removed.length;
  }
  console.log(`Result: ${removedTotal} server(s) removed.`);
  return 0;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`ensure-mcp: ${error.message}`);
    usage();
    process.exit(2);
  }

  const project = path.resolve(opts.project);
  if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
    console.error(`ensure-mcp: project directory does not exist: ${project}`);
    process.exit(2);
  }

  const code = opts.action === 'apply'
    ? apply(opts, project)
    : opts.action === 'remove'
      ? remove(opts, project)
      : check(opts, project);
  process.exit(code);
}

main();
