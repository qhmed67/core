# AGENTS.md

Personal, portable agent setup: four skills, git hooks, an OpenCode guard
plugin and a small installer. Keep it small. Every token here is paid in every session.

## Read first

1. `README.md` for layout and install commands.
2. `SOURCES.md` before editing or re-importing anything derived.
3. The `SKILL.md` you are about to change.

If asked to install or use this repository, follow "If you are an AI agent, do
exactly this" in `README.md`. Do not copy skills by hand.

## Invariants

- Author and committer: `qhmed67 <ahmedalmslm74@gmail.com>`. Set per
  repository, never globally. Source of truth: `githooks/identity`.
- No AI attribution in commits, PRs, issues or docs.
- No secret enters the repository. Do not read `.env`. Do not print environment
  variables. Reference `FIRECRAWL_API_KEY` and `GH_TOKEN` by name only.
- Every file is English, UTF-8, LF.
- No private product names outside `SOURCES.md`.
- Node 18+, standard library only. No CI, no runtime dependencies.
- Never set `CORE_ALLOW_*`. Only the owner may.
- Never commit agent or tool files to a project repository. The list is `CORE_AGENT_PATHS` in `githooks/identity`. The guard plugin keeps its own copy and `scripts/test-plugin.mjs` fails when they differ.

## Token budget

- `skills/` has four skills: `caveman`, `design`, `engineering`, `git-discipline`.
  Merge new content into one of them. Add a fifth only if no one fits.
- Detail that is needed rarely goes in a sibling file loaded on demand
  (`engineering/SLOP.md`, `engineering/WEB.md`, `engineering/SECURITY.md`, `engineering/CONTEXT.md`, `git-discipline/WRITING.md`), not in `SKILL.md`.
- Keep each `SKILL.md` under 10 KB and each `description` under 300 characters.
  The description is loaded in every session.
- Rarely used or large skills go in `extras/`. They install only with `--extras`.
- `templates/rules.md` is copied into every project's `AGENTS.md`/`CLAUDE.md`.
  Keep it at 20 lines or fewer. The validator checks the skill, description and rules budgets.
- Imperative bullets, no prose padding.

## Derived and imported content

- `skills/` is condensed from upstream projects. Record each source, commit,
  license and treatment in `SOURCES.md`. Keep upstream license files in
  `licenses/`.
- `extras/` is verbatim upstream. Do not edit bodies except to fix a path or
  satisfy the skill format. Record the change in `SOURCES.md`.

## Working on this repository

```sh
node scripts/validate-skills.mjs
node --check scripts/install.mjs scripts/ensure-mcp.mjs scripts/validate-skills.mjs
node scripts/test-plugin.mjs
sh -n githooks/pre-commit
sh -n githooks/commit-msg
sh -n githooks/pre-push
```

Test the installer in a temporary directory before committing installer changes:

```sh
tmp=$(mktemp -d)
node scripts/install.mjs --project "$tmp" --target agents --mcp skip
node scripts/install.mjs --project "$tmp" --target agents --mcp skip
rm -rf "$tmp"
```

The second run must report 0 new skills, `Rules: unchanged` and no new exclude
lines. Test hooks in a throwaway git repository: a force-added agent file, a bad
subject, a filler word, a long body, a big commit, a big push, wrong identity.
Test `ensure-mcp.mjs` against empty, v1, v2 and `.mcp.json` fixtures, with and
without `--servers`.

Commit one logical change at a time, Conventional Commits, imperative, 72
characters max. Review outgoing commits before pushing:

```sh
git log --format='%h %an <%ae> | %cn <%ce> | %s' @{upstream}..HEAD
```

Never use `--no-verify`.

## Changing the installer or MCP script

- Keep flags, defaults and target roots in `README.md` in sync with
  `scripts/install.mjs`.
- The installer is idempotent, never overwrites a non-core skill without
  `--force`, and never writes one skill to two targets in one run.
- The rules block is idempotent and lives between `<!-- core:begin -->` and
  `<!-- core:end -->`. Text outside the markers is never touched.
- `ensure-mcp.mjs` adds only the servers named by `--servers` (none by default),
  keeps environment references by name, and refuses to rewrite JSONC files that
  contain comments.
- `.core-manifest.json` is owned by the installer.
- `plugins/*.js` must start with `// core-managed:` and have exactly one export.
  OpenCode calls every export as a plugin. The installer never replaces a plugin
  that lacks the marker without `--force`.
- `.agent/` is local session state. The installer excludes it through
  `.git/info/exclude`. Never commit it.
- Run `node scripts/test-plugin.mjs` after any change to a blocking rule.

## Before reporting done

- Validator passes and scripts were exercised in a temporary directory.
- `git status` shows only intended files.
- No secret or private product name in the diff.
- Report what changed, what was tested, any known gap.
