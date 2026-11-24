# Writing commits, PRs and docs like an engineer

Load this before writing a commit body, a PR, a changelog line or a README
paragraph. There is no single book on this. The practice comes from the places
where thousands of patches get reviewed by people. This file is a condensed
restatement in new words. No text is copied. Origins are in `SOURCES.md`.

- Pro Git, "Contributing to a Project" (Chacon and Straub): commit hygiene, one idea per commit, subject plus body.
- Chris Beams, "How to Write a Git Commit Message" (2014): the seven rules, imperative subject, body explains what and why.
- Linux kernel, `Documentation/process/submitting-patches.rst`: problem first, then the fix, one logical change per patch, imperative mood.
- Google Engineering Practices, "Writing good CL descriptions" and "Small CLs": first line stands alone, body gives context, keep changes small.
- John Ousterhout, "A Philosophy of Software Design", comment chapters: comments record what the code cannot say.

## What they agree on

1. The subject says what changed, in the imperative, and stands alone in a one-line log.
2. The body says why. The diff already says how. Start from the problem.
3. One logical change per commit. If the subject needs "and", it is two commits.
4. Small changes get small messages. A subject is enough when the diff explains itself.
5. A reader six months later has the log, the diff and nothing else. Write for that reader.
6. Name the trade-off or the limit you accepted. Reviewers trust a description that admits one.
7. Re-read the description after review changes. It must match the final diff.
8. Do not narrate effort ("refactored", "cleaned up", "improved"). State the resulting behavior.
9. Comments and docs follow the same rule: record the reason and the contract, not the mechanics.

## Budgets

| Item | Limit |
| --- | --- |
| Commit subject | 72 characters, imperative, no period |
| Commit body | 12 lines, only when the why is not obvious |
| PR body | 20 lines |
| End-of-task report | 15 lines |
| README section | what it is, how to run, how to test |

## Commit examples

Subject only, enough:

```
fix(cli): exit with code 1 when the config file is missing
```

With a body, the problem first:

```
fix(auth): send expired tokens to login instead of refreshing

The client retried the refresh endpoint with an expired token. Each
retry returned 401 and counted against the rate limit, so a stale tab
could lock the account. An expired token now skips the refresh call.

Refresh still happens for tokens that are valid but close to expiry.
```

Rejected, and why:

```
fix: comprehensive improvements to robust token handling
```
Filler words. No behavior named. Not one change.

```
feat(api): add endpoint

This commit adds a new endpoint that leverages the existing service
layer to seamlessly return user data.
```
"This commit" opener, two banned words, and nothing about which endpoint or why.

## PR example

```markdown
fix(auth): send expired tokens to login instead of refreshing

## Problem
A stale browser tab kept calling /refresh with an expired token. Each call
returned 401 and counted toward the rate limit until the account locked.

## Change
TokenStore now reports `expired` separately from `near-expiry`. The auth
client refreshes only on `near-expiry` and redirects to login on `expired`.

    AuthClient -> TokenStore.status() -> expired | near-expiry | valid
    expired -> login   near-expiry -> /refresh   valid -> proceed

## Testing
- `npm test -- token-store` -> 14 passed (new cases: expired, boundary at 0s)
- e2e: `npx playwright test auth-expiry` -> passed against a real session

## Review notes
Clock skew is not handled. Server time and client time are assumed within 30s.
```

## Prose slop

These marks make a text read as machine-written. The kernel and Google guides do
not need a list: their rule is to write what happened, plainly. Use this list as
a check, not as a style.

Never, in any text you write:

- Chatbot residue: "Great question", "I hope this helps", "As an AI", "Certainly!".
- Announcing instead of saying: "Here's the thing", "Let's dive in", "It is important to note that".
- Performed candor or invented stakes: "to be honest", "in today's fast-paced world".
- Invented specifics. A number, name or cause you did not verify is worse than a vague word.

Replace on sight: leverage, utilize, comprehensive, robust, seamless,
streamline, holistic, delve, elevate, "in order to" (use "to"), "ensure that"
(use "check that" or state the guarantee), "various", "a number of".

Watch in clusters (fine alone, suspect in a stack): additionally, moreover,
furthermore, crucial, pivotal, notably, enhance, foster, landscape.

Structure tells:

- Three parallel items by reflex ("fast, reliable, and scalable").
- A closing paragraph that repeats the body.
- Bold on every other phrase. Headers on a five-line PR.
- Every sentence the same length.
- Bullets of bare noun phrases with no verbs.

Do not fix prose by adding personality. No invented opinions, no fake
experience, no staged candor, no chopped fragments for rhythm. Subtract filler
and keep the facts. If a fact is missing, leave the gap and report it.

This list is a condensed restatement of the ideas in conorbronsdon/avoid-ai-writing
(MIT), which was reviewed and not installed. See `SOURCES.md`.
