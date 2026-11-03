# Sources

Everything under `skills/` is either original to this repository, imported from
an upstream project, or a sanitized derivative of a private project. This file
records exactly where each part came from so a future agent can re-import,
audit or remove it without guessing.

- Import date: 2026-11-03.
- Upstream revisions are exact commit SHAs. Re-import from the SHA, not from a
  moving branch.
- Licenses for imported projects are copied into `licenses/` with a
  project-specific filename.
- Public third-party names (for example GSAP, Playwright, Firecrawl and
  Impeccable) are retained because they identify the imported skill or the
  required tool. Private product names appear only in this file.

## Imported and adapted

| Source | URL | Commit | License | Skills used | Treatment |
| --- | --- | --- | --- | --- | --- |
| caveman | https://github.com/juliusbrussee/caveman | `2e068f735253cce28256744804785f01887d9646` | Apache-2.0 | 11: `caveman`, `caveman-compress`, `caveman-review`, `investigate-first`, `lean-build`, `megacave`, `migration`, `safe-refactor`, `surgical-patch`, `ultracave`, `verify-and-stop` | Copied verbatim. Product/cloud-specific skills, `cavecrew`/`caveman-explore` (harness-specific) and `caveman-commit` (overlaps `git-discipline`) were skipped. |
| Matt Pocock skills | https://github.com/mattpocock/skills | `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` | MIT | 21: `codebase-design`, `code-review`, `diagnosing-bugs`, `domain-modeling`, `grilling`, `grill-me`, `grill-with-docs`, `handoff`, `implement`, `improve-codebase-architecture`, `pr`, `prototype`, `research`, `retro`, `setup-pre-commit`, `tdd`, `teach`, `to-questionnaire`, `wait-what`, `wizard`, `writing-for-agents` | Copied verbatim except one setup line removed from `code-review/SKILL.md` (`/setup-matt-pocock-skills`). Skipped `ask-matt`, `setup-matt`, `in-progress`, tracker-dependent skills (`to-spec`, `to-tickets`, `implement-spec`, `triage`, `wayfinder`), `migrate-to-shoehorn`, `scaffold-exercises` and `git-guardrails-claude-code`. |
| Cloudflare security audit | https://github.com/cloudflare/security-audit-skill | `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` | MIT | 1: `security-audit` | Copied verbatim. |
| Impeccable | https://github.com/pbakaus/impeccable | `9fadc41729c38fd47d7ae622b501558653f9d2e9` | Apache-2.0 | 1: `impeccable` | Copied from the canonical `.agents/skills/impeccable` tree, verbatim. The repository's other mirror directories were ignored. |
| Transitions.dev | https://github.com/Jakubantalik/transitions.dev | `e3aefb554d8fd2cb3e91e773e82a0f2d5a4f82a0` | Transitions.dev License (free personal and commercial use; no competing redistribution) | 3: `transitions-dev`, `transitions-polish`, `transitions-ui-generation` | Copied verbatim except the two oversized `description` fields were trimmed to the 1024-character skill limit. Skill bodies and linked files are unchanged. See `licenses/transitions.dev-LICENSE.txt`. |
| GSAP skills | https://github.com/greensock/gsap-skills | `aed9cfd3277740755f6bfc1155c7aa645403b760` | MIT | 8: `gsap-core`, `gsap-frameworks`, `gsap-performance`, `gsap-plugins`, `gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-utils` | Copied verbatim. |
| make-interfaces-feel-better | https://github.com/jakubkrehel/make-interfaces-feel-better | `35545ea1512ad59fa463e6b1f95ca9c052981fe6` | MIT | 1: `make-interfaces-feel-better` | Copied verbatim. |
| MorphLens | https://github.com/qhmed67/MorphLens | `277b37811fd03e32d3d0aedd1258417e7f9b0f56` | No license file; repository owner's own content | 2 derivatives: `interface-design-foundations` (from `design.md`), `react-native-motion` (from `SKILL.md`) | Sanitized: private product identity, app-specific screens, data models and feature descriptions removed. Only reusable design and React Native motion guidance kept. `architecture.md` was skipped as application-specific. |
| my-special-design-pattern | https://github.com/qhmed67/my-special-design-pattern | `bc5d777e448301bc36edacd5fcf4a7bd6f4558fd` | No license file; repository owner's own content | 1 derivative: `product-native-design` | Renamed to a descriptive, product-independent name and rewritten to be project-agnostic. No private product names or assets remain. |

Counts: 47 imported or adapted skill folders (including
`product-native-design`), 2 new sanitized derivatives from MorphLens
(`interface-design-foundations`, `react-native-motion`), and 2 original skills
(`git-discipline`, `mcp-baseline`), for 51 total.

## Inspiration only

These repositories were read for structure and enforcement patterns. No files
were copied into `skills/`.

| Source | URL | Commit | License | What it informed |
| --- | --- | --- | --- | --- |
| mitsuhiko/agent-stuff | https://github.com/mitsuhiko/agent-stuff | `0865c849befd2021490679f96a8dee58c84ac857` | Apache-2.0 | Small, composable skill folders and hook ergonomics. |
| ryoppippi/dotfiles | https://github.com/ryoppippi/dotfiles | `b86538e02a74a1d723714c4e47f38795851f247b` | MIT | Portable agent configuration layout. |
| sunsided/commit-skills | https://github.com/sunsided/commit-skills | `f44164bb112a1ba68b971bd88b803eb23a4c09c7` | No license file found | Commit message checks and identity enforcement ideas. |

## Re-import procedure

1. Clone the upstream at the recorded commit:

   ```sh
   git clone <url> /tmp/source
   git -C /tmp/source checkout <commit>
   ```

2. Compare the folder with `skills/<name>` before copying anything.
3. Copy only the skill folder and any files it links to.
4. Re-apply the treatment noted above. Do not import private product content.
5. Copy the upstream license to `licenses/` if it is not already there.
6. Run `node scripts/validate-skills.mjs` and test the installer.
7. Update this file if the commit, license or treatment changes.
