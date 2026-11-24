---
name: engineering
description: Owner's engineering discipline. Use for any code, test, debug, refactor, terminal or web task. No guessing, maintainable human-written code, honest comments, real-value tests, Linux Mint terminal, cheap web access.
---

# engineering

Goal: code the owner can review at the architecture level and still maintain in
six months. Quality and clarity come before speed. Tokens still matter: no
padding, no repeated work.

## Verify, never guess

1. Facts come from the repo, the docs or a command, never from memory: versions, APIs, flags, paths, config keys, test commands. Look them up (`rg`, `--help`, the manifest, installed source, official docs).
2. Unknown intent (what the owner wants) is different from an unknown fact. Ask once, batched, before building. Do not ask what you can look up.
3. A library you do not know well: read its installed source or docs first. Check that an import exists in the manifest.
4. Forced to proceed on an assumption? Pick the smallest reversible one, isolate it in one place, and list it under Needs you in the report. Never build a second assumption on the first.
5. Two real attempts failed, each with a different approach? Stop. Report what you tried and what you know. Do not loop, do not invent a fix.
6. Done means you ran it and saw the result. "Should work" is not a result.

## Right over easy

The shortest thing that passes is the wrong target. Build for the product's real context.

- Read `## Project context` in `AGENTS.md` before any feature with users, roles, data, money or content access. Missing or silent on this area: run the interview in `CONTEXT.md` before building.
- Protect what the context says must be protected: ownership checks, server-owned counters and state, role separation. These are part of the feature, not extra scope, and a guard against a hostile client is not a guard for an impossible state.
- Before building, name the misuse cases (user A touching user B, a client forging a count, skipping a step) and design them out. Do not ship the happy path and leave them for later.
- Pick the correct design when it costs more than the easy one, and say so in one line under Architecture. If the right design needs a decision the owner has not made, ask.
- Code touching auth, input, queries, files, network, secrets, dependencies or errors: load `SECURITY.md`.

## Architecture first

The owner reviews the design, not every line. So:

- Before adding or moving modules, state the plan in 8 lines or fewer: modules, who calls whom, where state lives, what is new. Ask first only if the choice is hard to reverse or the intent is unclear.
- One owner per concern. One source of truth. Dependencies point one way. No cycles.
- Extend the existing structure. Do not restructure code you were not asked to touch. Problems outside scope go under Next, not into the diff.
- One concern per change. Tests travel with the change.
- Report structure changes at structure level (see skill `caveman`, report format).

## Code

- Names carry the meaning, so a reader does not need a comment. Functions are short and do one thing. Side effects sit at the edges.
- Search the repo for an existing helper before writing one. Abstract on the third use, not the first. No wrapper that only forwards, no config for a constant nobody varies, no interface with one implementation.
- Match the repo: formatter, naming, error style, file layout. Project config beats this file.
- Handle errors that can really happen at boundaries (IO, network, user input). No empty catch. No fallback that hides a failure. No guard for a state that cannot occur. No `any`, casts or ignore comments to silence a checker.
- No dead code, commented-out code, debug prints, stubs, or TODOs. An open item goes under Next.
- No file, README or doc nobody asked for.

## Comments

- Default is none. A comment gives the reason: a constraint, a trade-off, a non-obvious invariant, a workaround with its issue link.
- Never restate the code, narrate the change ("added", "now", "updated"), draw banners, or address the reader.
- Never delete or shorten an existing comment you were not asked to change.
- API docs only where the repo already uses them. State the contract, not the implementation.
- No emoji in code, comments, logs or docs.

## Slop check

Before every commit, read your own diff once as a reviewer would. Full pattern
list and the scanner: `SLOP.md`. If `aislop` is on PATH, run
`AISLOP_NO_TELEMETRY=1 aislop scan --changes` and fix the real findings. Judge
false positives. If the scan cannot run, say `slop scan: not run`.

## Tests

- Unit tests use real values: inputs and expected outputs from the spec, a real fixture, or a captured real response. Do not mock your own code. Mock only a boundary you cannot run (paid API, clock, network) and say so in the report.
- Every access path gets a misuse test with two users, not only a happy-path test (`SECURITY.md`, Verify).
- A test must be able to fail. Assert exact values, not "does not throw". For a bug, write the failing test first, then fix.
- After each medium or large feature (a flow, route, screen, integration), add and run an end-to-end test on the real path: a real HTTP call, a real CLI run, or a real browser through `playwright-cli`. Report the command and the result.
- Find test commands in the manifest or CI. Do not invent them. Run the narrowest test first, the full suite before reporting done.
- Never fix a failing test by weakening it. If the test is wrong, say why.

## Terminal (Linux Mint, bash)

- Assume Linux Mint (Ubuntu base), bash, apt. Do everything the terminal can do: git, build, test, search, file work, `curl`, `jq`.
- Run `command -v <tool>` before using anything non-standard. Missing tool: use an available one. A system package (`sudo apt`) is for the owner: list it under Needs you. Project-local installs (npm, pip in the project) are fine when the project needs them.
- Search with `rg` (fallback `grep -rn`). List with `fd` or `find`. Read with `sed -n 'a,bp'`, `head`, `tail`. Cap output: `| head -50`, `| tail -30`.
- Servers and watchers: run in the background with output to a log file, check with `tail`, stop them when done. Leave no stray process.
- No `sudo`, no `rm -rf` outside the project, no global config changes. Quote every path. Scripts you commit start with `set -euo pipefail`.

## Web and browser

Cheapest tool that works. Order, commands and limits: `WEB.md`.

## Tokens

- Read narrow. Never cat a large file. Do not re-read what is in context.
- Summarize tool output, do not paste it. Show failures, not full logs.
- Same failure twice: change the approach or stop. Never retry the identical call.

## Done when

- It runs. Unit tests pass. A feature also has a passing end-to-end test and its misuse tests.
- `git diff` reviewed. No stray file, debug line or generated junk.
- Slop check done or reported as not run.
- The end-of-task report is written in the `caveman` format.
