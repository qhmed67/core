#!/usr/bin/env node
// Validate every skills/<name>/SKILL.md: frontmatter, name, description and
// uniqueness. Node 18+, no dependencies.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skillsRoot = path.resolve(here, '..', 'skills');
const errors = [];
const names = new Map();
let count = 0;

function fail(file, message) {
  errors.push(`${path.relative(process.cwd(), file)}: ${message}`);
}

function unquote(value) {
  const text = value.trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(1, -1);
    }
  }
  if (text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  return text;
}

function parseFrontmatter(file, text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') {
    fail(file, 'SKILL.md must start with ---');
    return null;
  }

  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    fail(file, 'frontmatter has no closing ---');
    return null;
  }

  const fields = {};
  let key = null;
  let buffer = [];
  let style = null; // 'folded' | 'literal' | null

  const flush = () => {
    if (!key) return;
    if (style) {
      let value = buffer.join('\n');
      if (style === 'folded') {
        value = value
          .split(/\n{2,}/)
          .map((part) => part.split('\n').map((line) => line.trim()).filter(Boolean).join(' '))
          .join('\n');
      } else {
        value = value.replace(/\n+$/, '');
      }
      fields[key] = value.trim();
    } else {
      fields[key] = unquote(buffer.join(' ').trim());
    }
    key = null;
    buffer = [];
    style = null;
  };

  for (let i = 1; i < end; i += 1) {
    const line = lines[i];
    const match = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (match) {
      flush();
      key = match[1];
      const raw = match[2].trim();
      if (raw === '>' || raw === '>-' || raw === '>+' || raw === '|' || raw === '|-' || raw === '|+') {
        style = raw.startsWith('>') ? 'folded' : 'literal';
        buffer = [];
      } else {
        style = null;
        buffer = [raw];
      }
      continue;
    }
    if (/^\s+\S/.test(line) || line.trim() === '') {
      if (key) buffer.push(line);
    }
  }
  flush();

  return fields;
}

function main() {
  if (!fs.existsSync(skillsRoot)) {
    console.error(`validate: skills directory not found: ${skillsRoot}`);
    process.exit(1);
  }

  const folders = fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folder of folders) {
    const file = path.join(skillsRoot, folder, 'SKILL.md');
    if (!fs.existsSync(file)) {
      fail(file, 'missing SKILL.md');
      continue;
    }

    count += 1;
    const text = fs.readFileSync(file, 'utf8');
    const fields = parseFrontmatter(file, text);
    if (!fields) continue;

    const name = (fields.name || '').trim();
    const description = (fields.description || '').trim();

    if (!name) {
      fail(file, 'missing name');
    } else if (name !== folder) {
      fail(file, `name "${name}" does not match folder "${folder}"`);
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      fail(file, 'name must use lowercase letters, digits and single hyphens');
    } else if (name.length > 64) {
      fail(file, 'name is longer than 64 characters');
    }

    if (!description) {
      fail(file, 'missing description');
    } else if (description.length > 1024) {
      fail(file, `description is ${description.length} characters; maximum is 1024`);
    }

    if (name) {
      if (names.has(name)) {
        fail(file, `duplicate name "${name}" (also in ${names.get(name)})`);
      } else {
        names.set(name, path.relative(process.cwd(), file));
      }
    }
  }

  if (errors.length > 0) {
    console.error(`validate: ${errors.length} problem(s) in ${count} skill(s)`);
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }

  console.log(`validate: ${count} skills valid`);
}

main();
