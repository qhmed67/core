# Project context interview

Run when a feature involves users, roles, data ownership, money, content access or
anything a user could abuse, and `AGENTS.md` has no `## Project context` section
covering it. The goal is the right design for this product, not the shortest code
that passes.

1. Read the repo first: README, schema, routes, existing auth, tests. Do not ask what you can look up.
2. Ask once, in plain text, in one batched message. At most six questions. Each one names a concrete thing in this product and carries your best guess, so the owner can answer "yes". No generic questions. Cover only what the repo left open:
   - Who are the actors, and what separates them?
   - Whose data is what? Who may see, change or delete it?
   - What must never happen? (misuse cases)
   - What is counted, graded, paid or limited, and must not be forged by a client?
   - Exposure: public, invite-only, minors, regulated data?
   - What already exists that I must not break?
3. The last question is always: "Anything else I should know that I did not ask: rules, users, risks, history, plans?"
4. Write a draft of 5 to 8 lines and show it. Save it only after the owner confirms.
5. Save it under `## Project context` in the project's `AGENTS.md` (or `CLAUDE.md`), outside the `core:begin` and `core:end` markers. The installer rewrites everything inside them.
6. Turn the "must never" lines into misuse tests (see `SECURITY.md`, Verify) before coding.

Update the section when the owner states a new rule. Do not grow it past 10 lines.

Example shape, content is illustrative:

```
## Project context
Product: video platform for students and teachers.
Actors: student, teacher, admin. A student sees only courses they are enrolled in.
Must never: a student reads or edits another student's data; a client sets its own view count or progress; a video URL works for a non-enrolled user.
Server-owned: view counts, progress, grades. The client only reports events.
Sensitive: student personal data, payment status.
```
