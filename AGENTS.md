# AGENTS.md

This repository is a portable set of agent skills, a git policy and an MCP
baseline. It is maintained as a personal source of truth and installed into
other projects. Keep it small, portable and honest about where each skill came
from.

## Read first

1. `README.md` for the layout, the catalog and the install commands.
2. `SOURCES.md` before editing or re-importing any third-party skill.
3. The `SKILL.md` you are about to change, and any files it links to.

If you are an AI agent asked to install or use this repository, follow the
procedure in `README.md` under "If you are an AI agent, do exactly this".
Do not copy skills by hand when the installer can do it.

## Invariants

- Author and committer are both `qhmed67 <ahmedalmslm74@gmail.com>`. Set them
  per repository, never globally. Read `githooks/identity` for the single
  source of truth.
- No AI attribution in commits, pull requests, issues or docs: no
  `Co-authored-by`/`Generated-by` trailers, no "Generated with" phrases, no
  robot emoji, no model name as author.
- No secret ever enters the repository. Do not read `.env` files. Do not print
  environment variables. Reference `FIRECRAWL_API_KEY` and `GH_TOKEN` by name
  only.
- Every file is English, UTF-8, LF line endings.
- No product-specific names or content from private applications outside
  `SOURCES.md`. Sanitized skills must stay generic.
- Third-party skills keep their upstream license. `SOURCES.md` records the URL,
  the exact commit and the license. Never change a recorded commit without
  re-importing and re-checking the skill.
- The repository ships no CI and no runtime dependencies. Scripts must run on
  Node 18+ with the standard library only.
- Do not edit the body of an imported skill to "improve" it. Only make the
  minimal changes needed to sanitize private content, fix a broken path, or
  satisfy the skill format. Record the change in `SOURCES.md`.

## Working on this repository

```sh
node scripts/validate-skills.mjs
node --check scripts/install.mjs
node --check scripts/ensure-mcp.mjs
node --check scripts/validate-skills.mjs
sh -n githooks/commit-msg
sh -n githooks/pre-push
```

Test the installer in a temporary directory before committing changes that
touch it:

```sh
tmp=$(mktemp -d)
node scripts/install.mjs --project "$tmp" --target agents --mcp skip
node scripts/install.mjs --project "$tmp" --target agents --mcp skip
rm -rf "$tmp"
```

The second run must succeed and report zero new skills. Test `--with-git-hooks`
in a temporary git repository, and test `ensure-mcp.mjs` against empty, v1, v2
and `.mcp.json` fixtures.

Commit one logical change at a time. Write the message in Conventional Commits
style, imperative, at most 72 characters. Review the outgoing commits before
pushing:

```sh
git log --format='%h %an <%ae> | %cn <%ce> | %s' @{upstream}..HEAD
```

Never use `--no-verify`. The hooks are part of the product.

## Adding a skill

1. Create `skills/<name>/SKILL.md` with frontmatter:

   ```yaml
   ---
   name: <name>
   description: What it does and when to use it. One paragraph, at most 1024 characters.
   ---
   ```

2. The folder and `name` must match, use lowercase letters, digits and single
   hyphens, and stay at 64 characters or fewer.
3. Put supporting files inside the same folder and link them with relative
   paths. Do not link outside the repository.
4. If the skill came from elsewhere, copy its license into `licenses/` and add
   a row to `SOURCES.md`. If it is original, say so in `SOURCES.md`.
5. Run the validator and update the catalog in `README.md`.
6. Install the result into a temporary project and confirm the skill appears.

## Changing the installer or MCP script

- Keep the CLI flags and defaults documented in `README.md` in sync with
  `scripts/install.mjs`.
- The installer must be idempotent, must not overwrite a non-core skill without
  `--force`, and must never write the same skill to two targets in one run.
- `ensure-mcp.mjs` must add only missing servers, enable a baseline server that
  is present but disabled, detect servers by command or package as well as by
  key, keep environment references by name, and refuse to rewrite JSONC files
  that contain comments.
- The manifest `.core-manifest.json` is owned by the installer. Do not edit it
  by hand in a target project.

## Before reporting done

- The validator passes.
- The relevant scripts were exercised in a temporary directory.
- `git status` shows only the intended files.
- No secret or private product name appears in the diff.
- The final report states what changed, what was tested, and any known gap.
