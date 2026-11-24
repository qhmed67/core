# Slop patterns in code

Load this when reviewing your own diff, cleaning a file, or when a scan reports
findings. Goal: code that reads as written by a careful engineer, easy to reuse
and maintain. Project conventions win: if the repo documents verbose comments,
follow the repo.

## Why these patterns matter

Most of them add words, not information. A reader (human or agent) loses
nothing when they go, and gains a smaller surface to read. Plain, well-named
code with a few "why" comments carries the same meaning for both.

## Patterns and the fix

| Pattern | Example | Fix |
| --- | --- | --- |
| Narrative comment | `// Check if user is null` | Delete. |
| Change narration | `// Added retry`, `// Now we parse` | Delete. History lives in git. |
| Banner comment | `// ===== Helpers =====` | Delete. Split the file if it needs sections. |
| Signature echo | `@param name The name` | Delete, or document the contract. |
| Wrapper that forwards | `function getUser(id) { return fetchUser(id) }` | Inline. |
| One-use abstraction | factory, interface or base class with one implementation | Inline the concrete type. |
| Constant as config | options object nobody varies | Use the constant. |
| Dump file | `utils`, `helpers`, `common` | Name the module for what it does. |
| Suffix soup | `UserDataManagerHandler` | Name the role once. |
| Empty or hiding catch | `catch {}`, `catch { return [] }` | Handle, rethrow with context, or let it surface. |
| Impossible-state guard | null check on a non-null type | Delete. |
| Hidden fallback | `count ?? 0` for a missing required input | Fail loudly at the boundary. |
| Type escape | `as any`, `@ts-ignore`, `unknown as T` | Fix the type. |
| Leftovers | `console.log`, commented-out code, `TODO`, "for now", stubs | Remove. Open items go in the report. |
| Hallucinated import | package or API not in the manifest | Verify it exists or replace it. |
| Vague names | `data2`, `tmp`, `result` everywhere, `processAndReturn` | Rename by meaning. |
| Cheerful logs | `Successfully completed!`, emoji | State the event and the key value. |
| Empty error text | `An error occurred` | Say what failed, with the input or id. |
| Hollow tests | `expect(true)`, "should work correctly" | Assert exact values. Name the behavior. |
| Doc bloat | marketing bullets in a README | State what it is, how to run it, how to test it. |

## Self-review before commit

Read `git diff` once. For each added comment ask: does it say why? If it only
says what, delete it. For each new function, file or option ask: is there a
second caller or a real need? If not, inline it. Run the repo's formatter and
linter. Then run the scan below.

## Scanner

`aislop` (github.com/scanaislop/aislop, MIT, deterministic, no model at scan
time). Reviewed from its docs on 2026-11-24, not executed in this repository.

```sh
AISLOP_NO_TELEMETRY=1 aislop scan --changes   # files changed against HEAD
AISLOP_NO_TELEMETRY=1 aislop scan --staged    # staged files only
AISLOP_NO_TELEMETRY=1 npx --yes aislop@latest scan --changes   # without a global install
aislop rules                                  # every rule
```

- It covers narrative and trivial comments, swallowed exceptions, unsafe casts, hallucinated imports, hardcoded URLs, console leftovers, todo stubs, unused CSS, plus lint and security checks.
- Telemetry is on by default and off when `CI=true`. `AISLOP_NO_TELEMETRY=1` or `DO_NOT_TRACK=1` turns it off. Keep the variable in the command.
- A finding is a signal. Fix what is real. A false positive gets a one-line mention in the report, not a silencing comment.
- Severity can be tuned per project in `.aislop/config.yml`. That file is project config: the owner decides whether it is committed.
- The `pre-commit` hook runs `aislop scan --staged` when `aislop` is installed. It only prints. It never blocks.

Alternatives, not used by default: `skew202/antislop` (Rust, flags TODOs, hedging, stubs), `flamehaven01/AI-SLOP-Detector` (Python, checks that comments and docs match the code).

## Prose slop

Commit messages, PRs, READMEs and docs: `skills/git-discipline/WRITING.md`.
