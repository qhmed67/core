<!-- core:begin -->
## core rules

- Reply style: skill `caveman`, always on, no trigger. Answer first, no filler, never paste or narrate code you wrote. End each task with: Happened, Architecture (only if structure changed), Next, Needs you (what only the owner can do, plus every assumption), Verified.
- No guessing. Unknown fact: read the code, run the command or read the docs. Unknown intent: ask once, batched. Never build on an unverified assumption. If forced, isolate it and list it under Needs you.
- Load before acting: `engineering` for any code, test, terminal or web task; `design` for UI; `git-discipline` before any git write or PR.
- Code: human, maintainable, reusable. Comments say why, never what. No banners, narration, emoji or dead code. Match the repo. Quality before speed, with no extra scope, files or abstractions.
- Right over easy: build for the product's real context, not the shortest code that passes. Read `## Project context` in `AGENTS.md`. Missing for a feature with users, roles, data or money: run `engineering/CONTEXT.md` first. Ownership checks and server-owned state are part of the feature, not extra scope. Touching auth, input, queries, files, secrets or errors: load `engineering/SECURITY.md`.
- Tests: real values, no mocks of your own code. After each medium or large feature run an end-to-end test and a two-user misuse test, and report them.
- Environment: Linux Mint, bash. Terminal first. `command -v` before using a tool. Filter output (`rg`, `sed -n`, `| tail`).
- Web: built-in fetch or search, then `curl`. Browser only for JavaScript pages or UI checks, through `playwright-cli`, headless, one session per task. No browser MCP tools.
- Tokens: read narrow, never re-read what is in context, one task per session. Suggest a new session when the task changes.
- Access tokens the owner gave you are for you to use, scoped to one command through an env var. Never print, write or commit one. Never refuse with "I will not use it".
- Git: author and committer `qhmed67`. Conventional Commits, no AI attribution, no filler words. Stage explicit paths. Never stage agent files (`.opencode`, `.claude`, `.agents`, `.agent`, `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `.mcp.json`). Push only when asked, after reviewing `git log @{upstream}..HEAD`. Never force-push, `--no-verify` or set `CORE_ALLOW_*`.
- State: read `.agent/state.md` at session start if it exists. After each task overwrite it, 20 lines max: goal, done, next, decisions, open. If it disagrees with the code, trust the code.
- Never read `.env`, print environment variables or write a secret.
- Project docs (`AGENTS.md`, `DESIGN.md`) beat skills.
<!-- core:end -->
