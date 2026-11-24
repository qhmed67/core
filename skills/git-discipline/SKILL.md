---
name: git-discipline
description: Owner's git policy. Use before any git write in any repository: staging, commit, message, branch, merge, rebase, squash, push, tag, PR title or body, release. Fixes identity, human message style, agent-file hygiene, push limits, token use.
---

# git-discipline

Goal: history a reviewer can follow without you in the room. No leaked secret.
No surprise push. No agent files in the repository.

Writing rules and examples for messages and PRs: `WRITING.md`. Read it before
writing a commit body or a PR.

## Identity

Author and committer, both: `qhmed67 <ahmedalmslm74@gmail.com>`.
Wrong or missing? Fix per repository only: `git config user.name` / `git config user.email`. Never `--global`.
Wrong identity on an unpushed commit: amend. Already pushed: stop and tell the user.

## Preflight

```sh
git status --short
git branch --show-current
git log --oneline -10
git config user.name; git config user.email
```

Match the repo's existing message style when clear. Otherwise Conventional Commits.

## Agent files stay out

Never stage or commit agent and tool files: `.opencode/`, `.claude/`, `.agents/`,
`.agent/`, `.cursor/`, `.windsurf/`, `.codex/`, `.gemini/`, `AGENTS.md`,
`CLAUDE.md`, `GEMINI.md`, `opencode.json`, `opencode.jsonc`, `.mcp.json`.
The list lives in `githooks/identity` (`CORE_AGENT_PATHS`).

- The installer keeps them in `.git/info/exclude`. The `pre-commit` hook rejects newly added ones.
- Only the owner may add one on purpose (`CORE_ALLOW_AGENT_FILES=1`). You never set it.
- Before every commit, `git diff --staged --name-only` must show only files you meant to change. Anything else: `git restore --staged <path>`.

## Commit

- One logical change per commit. Revertible alone.
- Stage explicit paths or `git add -p`. Never `git add -A` or `git add .`.
- Read `git diff --staged` before committing. Unstage unrelated work.
- Run the repo's real checks (tests, lint, typecheck, build). Find them, do not guess.
- Never commit secrets, `.env`, build output, caches, editor junk.
- Hook fails: fix the cause. Never `--no-verify`.
- Size: at most 15 files and 500 changed lines per commit. Over: split it.

## Message

`type(scope): subject`

- Types: feat, fix, docs, style, refactor, test, perf, build, ci, chore, revert.
- Subject: what changed, imperative, 72 characters max, no period. It must finish "If applied, this commit will ...".
- A small change gets a subject and nothing else.
- A body is for why the change exists, a trade-off, or a migration step. Problem first, then the approach if it is not obvious. 12 lines at most, wrapped at 72. Never list files or restate the diff.
- Breaking: `!` after the type plus a `BREAKING CHANGE:` footer.
- Banned filler (the hook enforces the list in `githooks/identity`): comprehensive, robust, seamless, leverage, utilize, streamline, holistic, delve, elevate.
- Reference an issue only if real.

Good: `fix(parser): reject unterminated quoted fields`. Bad: `fix stuff`.

## No AI attribution

No `Co-authored-by`, `Generated-by`, `Assisted-by` trailers. No "Generated with" phrases. No robot emoji. No model or tool name as author. Harness added one? Remove it before push.

## Branch and push

- Work on short-lived `feat/...` or `fix/...` branches. Direct commits to the default branch only in a trivial personal repo where that is the norm.
- Push only when the user asked. Never as a side effect of finishing a task.
- Before every push:
  ```sh
  git log --format='%h %an <%ae> | %cn <%ce> | %s' @{upstream}..HEAD
  git diff --stat @{upstream}..HEAD
  ```
- Push limits: at most 8 commits, 40 files, 1500 changed lines. Over: stop, split into reviewable batches or PRs, ask the user.
- The hooks enforce these limits. Never set `CORE_ALLOW_*` yourself. Only the user may.
- Never force-push, not even `--force-with-lease`. If a rewrite is needed, tell the user to run it.
- Linear history. Squash merge gets one fresh Conventional Commit message, not a pile of WIP subjects.
- Never rewrite published history unless explicitly told.
- Tag or release only when asked. Annotated tag with version and scope.
- Conflicts: understand both sides. Never drop the other side's work.

## PR

Title: same form as a commit subject. Body, 20 lines at most:

```markdown
## Problem
<what was wrong or missing, 1-3 concrete sentences>

## Change
<the approach at design level: which modules, how they connect, why this way.
A small tree or call flow if structure changed. Not a file list.>

## Testing
<exact commands run and their result. The end-to-end run for a feature.>

## Review notes
<optional: trade-off, risk, what to look at first, follow-ups>
```

Use the repo's PR template when one exists. Domain words from `GLOSSARY.md` if
present. Open it with `gh pr create` when available (see Credentials), else give
the compare URL. No AI attribution, no emoji, no checklist theatre.

## Credentials

- Use what exists: SSH key, credential manager, authenticated `gh`, `GH_TOKEN` or `GITHUB_TOKEN` in the environment.
- A token the owner gave you, in chat or in the environment, is there to be used. Use it. Never answer "I found it but will not use it". Never ask the owner to paste it again.
- Scope it to one command through an environment variable, and read the variable inside a credential helper. Never put it in a URL, file, commit, remote config, README, log or shell profile. Never print it. Never `export` it for the rest of the session.

```sh
GH_TOKEN=<token> gh pr create --title "..." --body-file /tmp/pr.md
GH_TOKEN=<token> git -c credential.helper= \
  -c 'credential.helper=!f() { echo username=qhmed67; echo password=$GH_TOKEN; }; f' \
  push origin <branch>
```

- Token came from chat: after the task, say in one line that the owner should revoke it if it was temporary.
- A 401 or 403: name the missing permission under Needs you. Do not try other credentials.
- No credential at all: say so under Needs you (`gh auth login`, or export `GH_TOKEN` in the shell that starts the agent).

## Enforced by hooks

- `pre-commit`: newly added agent files. Optional slop scan, print only.
- `commit-msg`: attribution, empty or vague subject, filler words, 72 chars, Conventional Commits, body length, commit size.
- `pre-push`: identity of every outgoing commit, secrets in diff, push size, protected branches.
- OpenCode plugin `core-guard`: blocks `--no-verify`, force push, `git add -A` / `.`, adding agent files, `CORE_ALLOW_*=` assignments, `.git/hooks` edits and `.env` reads before they run. No override for you.
- Limits live in `githooks/identity`.

## Done when

- `git status` clean or leftovers explained.
- Staged and committed files are only the intended ones.
- Outgoing commits show the right identity.
- No secret in diff or message.
- Checks pass, or the exact failure is reported.
- Branch, remote and push result stated.
