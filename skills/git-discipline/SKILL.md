---
name: git-discipline
description: Apply disciplined git practice to any commit, push, merge, rebase, squash, tag, release or pull-request task in any repository or language. Use before staging, writing a commit message, resolving conflicts, rewriting local history, pushing, opening a PR, or tagging a release.
---

# Git discipline

Use this skill for every git task, in every repository. It is deliberately
stricter than "make it commit": the goal is history a reviewer can follow
without you in the room, and a repository that never leaks a credential or an
invented author.

## 1. Preflight every time

Run these before changing the index or history:

```sh
git status
git branch --show-current
git log --oneline -10
git config user.name
git config user.email
```

Read the recent log before writing a message. Follow the repository's existing
style when it is clear and consistent. If there is no clear style, default to
Conventional Commits.

### Identity

Author and committer must both be:

```text
qhmed67 <ahmedalmslm74@gmail.com>
```

If either `user.name` or `user.email` is different, fix it in that repository
only:

```sh
git config user.name "qhmed67"
git config user.email "ahmedalmslm74@gmail.com"
```

Never change global git config. Never commit with another identity. If a commit
already exists with the wrong identity and has not been pushed, amend it. If it
has been pushed, stop and tell the user; do not rewrite published history
without an explicit instruction.

### Outgoing commits

Before every push, list exactly what will leave the machine:

```sh
git log --format='%h %an <%ae> | %cn <%ce> | %s' @{upstream}..HEAD
```

If there is no upstream, compare against the remote's default branch or the
merge base. Fix any identity or attribution violation before pushing.

## 2. Commit hygiene

- One logical change per commit. A commit should be revertible on its own, and
  a change that must land together should not be split into a broken sequence.
- Stage deliberately: `git add -p` for partial work, or explicit paths. Never
  run a blind `git add -A` or `git add .`.
- Read `git diff --staged` before every commit. If it contains unrelated work,
  unstage it.
- Run the project's checks when they exist: tests, lint, typecheck, build. Find
  the real commands in the repository (README, `package.json`, `Makefile`,
  `pyproject.toml`, `Cargo.toml`, CI config) rather than guessing.
- Never commit secrets, `.env` files, credentials, build output, dependency
  caches, coverage reports or editor junk.
- If a pre-commit hook fails, fix the cause. Do not bypass it.
- Keep the working tree clean enough that `git status` after the commit shows
  only deliberate leftovers.

## 3. Message quality

Format:

```text
type(scope): subject

Optional body explaining why, and any trade-off.

BREAKING CHANGE: what breaks and what to do instead.
Refs: #123
```

Rules:

- `type` is one of `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`,
  `ci`, `chore` or `revert` unless the repository uses another vocabulary.
- `scope` is optional, short and noun-like.
- Subject is imperative, at most 72 characters, aiming for 50, with no trailing
  period.
- Body is optional. Add it when it explains the why, a trade-off, a migration
  step or a surprising consequence. Wrap it at 72 characters.
- Use `!` after the type or scope, plus a `BREAKING CHANGE:` footer, for a
  breaking change.
- Reference an issue only when the reference is real.
- Match the repository's emoji convention. If it has none, use none.
- No vague subjects and no filler. "This commit", "comprehensive", "robust",
  "seamless" and "leverage" describe nothing. Say what changed.

| Good | Bad |
| --- | --- |
| `feat(auth): add passkey sign-in` | `update` |
| `fix(parser): reject unterminated quoted fields` | `fix stuff` |
| `docs: explain Claude Code setup` | `docs: comprehensive documentation improvements` |
| `refactor(api): extract retry policy` | `refactor: robust seamless leverage` |
| `perf(search): avoid duplicate index scans` | `perf: improvements` |
| `test(cart): cover expired discount codes` | `changes` |

A body earns its place:

```text
fix(queue): retry transient publish failures

The broker can return a 503 while a leader election finishes. Retrying
three times with jitter avoids dropping a job during that window without
masking permanent authorization failures.

Refs: #481
```

## 4. Attribution

Author and committer must both be `qhmed67 <ahmedalmslm74@gmail.com>`.

No AI attribution anywhere:

- no `Co-authored-by`, `Generated-by`, `Assisted-by` or `code-author` trailers;
- no "Generated with ...", "AI-generated" or similar phrases;
- no robot emoji;
- no model or tool name as author or co-author.

If the harness or a tool adds attribution automatically, remove it before
pushing. Amend the commit if it is unpublished, and disable the setting if the
tool exposes one. The hooks in this repository enforce the trailer and phrase
rules locally; they do not replace reviewing the message yourself.

## 5. Branches, pushes, merges and squash

- Keep branches short-lived. Use `feat/...` or `fix/...` unless the repository is
  a trivial personal one where committing directly is the established norm.
- Push only after local checks pass and the outgoing commits have been reviewed.
- Never force-push a shared branch.
- `--force-with-lease` is allowed only on your own unpublished feature branch,
  and only when the user explicitly asked for it.
- Prefer linear history: update the branch from its base, resolve conflicts,
  then fast-forward or squash-merge.
- A squash merge gets one freshly written Conventional Commit message that
  describes the whole change. Do not paste a pile of WIP subjects into it.
- Never rewrite published history without an explicit instruction.
- Delete merged branches when the repository allows it.
- Tag or release only when the user asks. Annotated tags for releases; include
  a message that states the version and the scope.
- Resolve conflicts by understanding both sides. Do not discard the other
  side's work to make the conflict disappear.

For a pull request:

1. Confirm the branch is pushed and the base branch is current.
2. Write a concise body: what changed, why, how it was verified, and any risk
   or follow-up.
3. Use the repository's template when one exists.
4. Use `gh pr create` when available; otherwise give the user the compare URL.
5. Never add AI attribution to the PR body or comments.

## 6. Credentials

Use what the machine already has: an SSH key, the platform credential manager,
or an authenticated `gh` session. Do not create global git configuration.

If a one-shot token is required, read it from an environment variable in an
inline credential helper and keep the remote URL clean:

```sh
git -c credential.helper= \
  -c 'credential.helper=!f() { echo username=USERNAME; echo password=$GH_TOKEN; }; f' \
  push origin main
```

Rules:

- Never put a token in a URL, a file, a commit message, a README or shell
  history.
- Never print, echo or log a token.
- Never run commands that dump the whole environment.
- Never ask the user to paste a secret into the chat.
- Use the narrowest token available; do not request broader permissions.

## 7. Enforcement

This repository ships two hooks:

- `githooks/commit-msg` rejects AI attribution trailers and phrases, empty or
  vague subjects, and subjects longer than 72 characters. It does not enforce
  Conventional Commits, because other repositories may use another style.
- `githooks/pre-push` checks the author and committer of every outgoing commit
  and blocks secret-looking strings in outgoing diffs.

Install them with `scripts/install.mjs --with-git-hooks`. There is no bypass
flag in either hook. `git commit --no-verify` and `git push --no-verify` are
still Git features, but this policy forbids using them. If a hook blocks a
legitimate change, fix the change or the hook in the open, not with a bypass.

## 8. Before you report done

- `git status` is clean or only contains deliberate, explained leftovers.
- `git log --oneline -10` reads coherently.
- The outgoing commit list shows the correct author and committer.
- No secret appears in the diff or the message.
- The project's checks pass, or the exact failure is reported.
- The branch, remote and push result are stated.
