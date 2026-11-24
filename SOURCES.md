# Sources

`skills/` holds four condensed skills written for this repository. They are
derived from the projects below. `extras/` holds one optional skill copied
verbatim. This file records where each part came from.

- Reworked: 2026-11-24 (engineering skill, OWASP checklist, project context interview, MCP remove, medium caveman, human git writing, agent-file hygiene, MCP opt-in). Reorganized: 2026-11-20. Previous import date: 2026-11-03.
- Upstream revisions are exact commit SHAs.
- Licenses of every project still used are in `licenses/`.

## What each skill is built from

| Skill | Built from | License | Treatment |
| --- | --- | --- | --- |
| `caveman` | [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) `2e068f735253cce28256744804785f01887d9646` (`caveman`) | Apache-2.0 | Modified: condensed to one level, then reworked on 2026-11-24 to a medium level with an owner-defined report (Happened, Architecture, Next, Needs you, Verified). `megacave`, `ultracave`, `caveman-review`, `caveman-compress` dropped. |
| `engineering` | Original (owner requirements, 2026-11-24). `SLOP.md` points to aislop. `WEB.md` follows the Playwright CLI docs. `SECURITY.md` condenses [OWASP Top 10:2025](https://top10.owasp.org/2025/) (A01 to A10, read 2026-11-24). `CONTEXT.md` is original. | Original / CC BY 3.0 (OWASP) | New. No upstream text copied except the OWASP-derived `SECURITY.md`, which is reworded and attributed in `licenses/owasp-top10-NOTICE.txt`. |
| `git-discipline` | Original (owner). `WRITING.md` is an original restatement of public engineering guides (see Inspiration only). The 2026-11-24 PR body replaces the earlier template taken from mattpocock `pr` (Dex Horthy's `show-me` visuals). | Original / MIT | Condensed. Push size limits, protected-branch rules, agent-file rule, token-use rule and human message style added. `licenses/mattpocock-skills-LICENSE.txt` is kept until the owner decides. |
| `design` | Owner's own `product-native-design` ([my-special-design-pattern](https://github.com/qhmed67/my-special-design-pattern) `bc5d777e448301bc36edacd5fcf4a7bd6f4558fd`), `interface-design-foundations` and `react-native-motion` ([MorphLens](https://github.com/qhmed67/MorphLens) `277b37811fd03e32d3d0aedd1258417e7f9b0f56`); details from [jakubkrehel/make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) `35545ea1512ad59fa463e6b1f95ca9c052981fe6` | Owner's own / MIT | Merged and condensed. Private product names stay out. |
| `extras/security-audit` | [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` | MIT | Copied verbatim. Installed only with `--extras`. |

## Original work

`plugins/core-guard.js`, `scripts/test-plugin.mjs`, `templates/rules.md` and the git hooks are original. The plugin follows the hook names and shapes in the OpenCode plugin docs (`tool.execute.before`, `experimental.session.compacting`).

## Removed on 2026-11-20

Recoverable from git history (commit before the reorganization).

| Removed | Why |
| --- | --- |
| `impeccable` ([pbakaus/impeccable](https://github.com/pbakaus/impeccable) `9fadc41729c38fd47d7ae622b501558653f9d2e9`, Apache-2.0) | Generic taste and a 1.1 MB font index. The owner's `design` skill replaces it. |
| `transitions-dev`, `transitions-polish`, `transitions-ui-generation` (Transitions.dev, `e3aefb554d8fd2cb3e91e773e82a0f2d5a4f82a0`) | Recipe libraries. `design` keeps the motion tokens and rules. License file removed with them. |
| 8 `gsap-*` skills ([greensock/gsap-skills](https://github.com/greensock/gsap-skills) `aed9cfd3277740755f6bfc1155c7aa645403b760`, MIT) | Large API references. `design` keeps the ownership rules. Add back per project when needed. |
| `caveman-compress`, `caveman-review`, `megacave`, `ultracave` | Merged into `caveman` or dropped. |
| `investigate-first`, `surgical-patch`, `diagnosing-bugs`, `lean-build`, `safe-refactor`, `migration`, `verify-and-stop`, `tdd`, `code-review`, `implement`, `handoff` | Dropped. An interim merged `workflow` skill was removed by the owner on 2026-11-20. Review and handoff are plain prompts or the `.agent/state.md` rule. |
| `pr` | Merged into `git-discipline`. |
| `mcp-baseline` | Redundant. `install.mjs --mcp apply` does the same. |
| `grilling`, `grill-me`, `grill-with-docs`, `wait-what`, `to-questionnaire`, `wizard`, `teach`, `prototype`, `retro`, `research`, `setup-pre-commit`, `writing-for-agents`, `domain-modeling`, `codebase-design`, `improve-codebase-architecture` | Rarely used, overlapping, or one-time tasks. |
| `interface-design-foundations`, `product-native-design`, `make-interfaces-feel-better`, `react-native-motion` | Merged into `design`. |

## Inspiration only

Reviewed 2026-11-24. No text copied from any row below unless stated.

| Source | Commit | License | What it informed |
| --- | --- | --- | --- |
| [conorbronsdon/avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) | `47758aafdd9a9283bbbcd6cabbdf59fcc23d9581` | MIT | Prose-only skill, English-calibrated, refuses source code, large (a patterns file must be read in full before any pass). Not installed. Its ideas of tiers, "never inject personality" and "subtract, do not invent" are restated in `WRITING.md` in new words. |
| [scanaislop/aislop](https://github.com/scanaislop/aislop) | docs read, version not pinned | MIT | Deterministic code-slop scanner. Not vendored. Named in `SLOP.md` and run by `pre-commit` when installed. Telemetry on by default, off with `AISLOP_NO_TELEMETRY=1`. Not executed in this repository. |
| [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) | docs read, version not pinned | not checked | Token-efficient browser CLI for coding agents. Followed in `WEB.md`. Needs Node 20 or newer. Not vendored. |
| Pro Git, "Contributing to a Project" (Chacon, Straub) | n/a | not checked, no text copied | Commit hygiene. Restated from memory, not re-read for this change. |
| Chris Beams, "How to Write a Git Commit Message" | n/a | not checked, no text copied | The seven rules. Restated from memory, not re-read for this change. |
| Linux kernel `Documentation/process/submitting-patches.rst` | n/a | not checked, no text copied | Problem first, one change per patch. Restated from memory, not re-read for this change. |
| [Google Engineering Practices](https://google.github.io/eng-practices/review/developer/cl-descriptions.html) | n/a | not checked, no text copied | First line stands alone, body gives context, small changes. The CL descriptions page was read on 2026-11-24. |
| John Ousterhout, "A Philosophy of Software Design" | n/a | book | Comments record what code cannot say. Restated from memory in `engineering` and `WRITING.md`, not re-read for this change. |
| mitsuhiko/agent-stuff | `0865c849befd2021490679f96a8dee58c84ac857` | Apache-2.0 | Small composable skill folders, hook ergonomics. |
| ryoppippi/dotfiles | `b86538e02a74a1d723714c4e47f38795851f247b` | MIT | Portable agent configuration layout. |
| sunsided/commit-skills | `f44164bb112a1ba68b971bd88b803eb23a4c09c7` | No license file | Commit message checks, identity enforcement. |
