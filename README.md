# If you are an AI agent, do exactly this

You are reading the canonical `core` repository. Do not improvise a different
layout, a different installer or a different MCP shape.

1. Read `AGENTS.md` and `SOURCES.md` before changing anything. `AGENTS.md` has
   the invariants; this file has the commands.
2. Confirm you are in a clone of `qhmed67/core`:

   ```sh
   git remote get-url origin
   git status --short
   ```

   If the working tree has changes you did not make, stop and report them.
3. Validate the skills before using or editing them:

   ```sh
   node scripts/validate-skills.mjs
   ```

   Do not continue if it fails.
4. Choose exactly one task:
   - **Install into a project.** Run:

     ```sh
     node scripts/install.mjs --project <project-path> --mcp apply
     ```

     Add `--scope global`, `--target opencode|claude|agents`, `--mode link`,
     `--with-git-hooks` or `--force` only when the user asked for them. The
     default is project scope, auto-detected target, copy mode and MCP apply.
   - **Set up a global target.** Name the target explicitly:

     ```sh
     node scripts/install.mjs --scope global --target opencode --mode link --mcp apply
     ```

   - **Use a skill without installing it.** Read
     `skills/<name>/SKILL.md` and follow it. Do not copy it by hand.
   - **Change this repository.** Follow "Updating this repository" below.
5. After an install, verify the result:

   ```sh
   node scripts/ensure-mcp.mjs --check --project <project-path>
   node -e "const m=require('<target-root>/.core-manifest.json'); console.log(m.commit, m.skills.length)"
   ```

   Use the real target root (`~/.config/opencode/skills`, `~/.claude/skills` or
   `~/.agents/skills`) when the scope is global.
6. Never create a `.env` file, never print an environment variable and never
   put a token in a URL, a config file or a commit. `FIRECRAWL_API_KEY` is
   referenced by name only. If it is missing, tell the user to export it.
7. Report exactly what you ran, the target root, the skill count, the MCP
   result and anything skipped. If a check fails, stop and report the failure;
   do not silently switch to a manual install or a different config shape.

---

# core

A personal, portable set of agent skills, git rules and an MCP baseline. It is
designed to be cloned once and installed into any project, for OpenCode, Claude
Code or the shared `.agents` convention. It has no runtime dependencies, no CI
and no build step: Node 18+ is enough.

The repository is private. See [Access](#access) before cloning it on a new
machine.

## What is in the box

- 51 skills covering engineering workflow, design, motion, security and agent
  writing.
- A deterministic installer that copies or links skills into one target and
  records what it owns in `.core-manifest.json`.
- An MCP baseline for Playwright and Firecrawl, with OpenCode v1, OpenCode v2
  and Claude Code `.mcp.json` shapes.
- Git hooks that enforce the canonical identity, reject AI attribution and
  vague subjects, and block secret-looking strings before a push.
- A validator that checks every skill folder and its frontmatter.

## Bootstrap prompt

Paste this into an agent that already has access to the machine's GitHub
credentials. Replace the two paths.

```text
Clone https://github.com/qhmed67/core.git to <checkout-path> if it is not
already there. Read <checkout-path>/README.md, AGENTS.md and SOURCES.md.
Run node scripts/validate-skills.mjs. Then install the skills into
<project-path> with:

  node scripts/install.mjs --project <project-path> --mcp apply

Report the target root, the number of skills installed, any skills skipped and
the MCP check result. Do not print, write or commit any token or API key. Do
not add AI attribution to any commit.
```

## Quick start

```sh
git clone git@github.com:qhmed67/core.git core
cd core
node scripts/validate-skills.mjs
node scripts/install.mjs --project ../my-app --mcp apply
```

The default target is auto-detected:

- project scope: an existing `.opencode` directory or `opencode.json(c)` means
  `opencode`; an existing `.claude` directory means `claude`; otherwise
  `agents`;
- global scope: an existing `~/.config/opencode` means `opencode`; an existing
  `~/.claude` means `claude`; otherwise `agents`.

Pass `--target` when the default is not what you want. Global installs should
name the target explicitly.

### Installer options

| Option | Values | Default | Meaning |
| --- | --- | --- | --- |
| `--project <dir>` | path | current directory | Project to install into. |
| `--scope <scope>` | `project`, `global` | `project` | Project-local or home-directory target. |
| `--target <target>` | `auto`, `opencode`, `claude`, `agents` | `auto` | Which agent convention to use. |
| `--mode <mode>` | `copy`, `link` | `copy` | Copy folders or symlink them to this checkout. |
| `--with-git-hooks` | flag | off | Install `commit-msg` and `pre-push` into the project's `.git/hooks`. |
| `--mcp <action>` | `check`, `apply`, `skip` | `apply` | Check, add or skip the Playwright/Firecrawl baseline. |
| `--force` | flag | off | Replace conflicting skills and chain existing hooks. |
| `--help` | flag | — | Print the built-in help. |

The POSIX wrapper is `scripts/install.sh`; the PowerShell wrapper is
`scripts/install.ps1`. Both forward every argument to `scripts/install.mjs`.

### Target roots

| Target | Project | Global |
| --- | --- | --- |
| `opencode` | `<project>/.opencode/skills` | `~/.config/opencode/skills` |
| `claude` | `<project>/.claude/skills` | `~/.claude/skills` |
| `agents` | `<project>/.agents/skills` | `~/.agents/skills` |

### What the installer guarantees

- Idempotent: a second run reports zero new skills and does not duplicate
  anything.
- One target per run. It never writes the same skill to two targets at once.
- A manifest at `<target>/.core-manifest.json` with this repository's path,
  commit, mode, timestamp and installed skill names.
- A skill that already exists but is not listed in the manifest is skipped with
  a warning. `--force` replaces it.
- Core-owned skills that disappeared from this repository are pruned.
- `--mode link` points at this checkout, so edits here are live in the target.
  Do not delete or move the checkout afterwards.
- With `--with-git-hooks`, an existing foreign hook aborts the install unless
  `--force` is used. With `--force`, the old hook is moved to
  `commit-msg.pre-core` / `pre-push.pre-core` and chained.

## Layout

```text
skills/                 One folder per skill, each with SKILL.md
scripts/install.mjs     Installer and manifest logic
scripts/install.sh      POSIX wrapper
scripts/install.ps1     PowerShell wrapper
scripts/ensure-mcp.mjs  Playwright/Firecrawl check and apply
scripts/validate-skills.mjs
githooks/identity       Canonical author and committer
githooks/commit-msg     Message checks
githooks/pre-push       Identity and secret checks
licenses/               Upstream licenses for imported skills
AGENTS.md               Instructions for agents working on this repo
CLAUDE.md               One line: @AGENTS.md
SOURCES.md              URL, commit and license for every imported skill
```

## Catalog

### Core

| Skill | What it does |
| --- | --- |
| `git-discipline` | Commit, push, merge, rebase, squash, tag and PR rules, including identity, attribution, secret hygiene and outgoing-commit review. |
| `mcp-baseline` | Ensure Playwright and Firecrawl are configured, with v1, v2 and `.mcp.json` examples and safety rules. |

### Engineering workflow

| Skill | What it does |
| --- | --- |
| `caveman` | Compressed, high-signal communication mode for long agent sessions. |
| `caveman-compress` | Compress context and files without losing decisions. |
| `caveman-review` | Terse, evidence-first code review. |
| `investigate-first` | Diagnose ambiguous failures before editing. |
| `lean-build` | Build features with a bias against overbuilding. |
| `megacave` | Large-task variant of the caveman workflow. |
| `migration` | Reversible, compatibility-safe transitions for schemas, data, APIs, protocols and config. |
| `safe-refactor` | Restructure code while preserving behavior. |
| `surgical-patch` | Fix bugs at the narrowest responsible layer. |
| `ultracave` | Maximum-compression variant of the caveman workflow. |
| `verify-and-stop` | Prove work meets acceptance conditions without scope creep. |
| `codebase-design` | Shared vocabulary for designing deep modules. |
| `code-review` | Review changes against standards and the original spec. |
| `diagnosing-bugs` | A diagnosis loop for hard bugs and performance regressions. |
| `domain-modeling` | Build and sharpen a project's domain model and glossary. |
| `grilling` | Stress-test a plan, decision or idea. |
| `grill-me` | A relentless interview to sharpen a plan. |
| `grill-with-docs` | Grilling that also writes ADRs and glossary entries. |
| `handoff` | Compact a conversation into a handoff document for another agent. |
| `implement` | Implement work from a spec or a set of tickets. |
| `improve-codebase-architecture` | Find deepening opportunities and work through them. |
| `pr` | Write a pull request body. |
| `prototype` | Build a throwaway prototype to answer a design question. |
| `research` | Investigate against primary sources and capture the findings. |
| `retro` | Run a retrospective on a coding session. |
| `setup-pre-commit` | Set up Husky, lint-staged, type checking and tests. |
| `tdd` | Test-driven development, red-green-refactor. |
| `teach` | Teach a concept inside the workspace. |
| `to-questionnaire` | Turn a decision you cannot answer into a questionnaire for someone else. |
| `wait-what` | Re-pitch a message that did not land. |
| `wizard` | Generate an interactive bash wizard for steps only a human can perform. |
| `writing-for-agents` | Write skills, AGENTS.md and other documents for agents. |

### Design and motion

| Skill | What it does |
| --- | --- |
| `impeccable` | Design, redesign, critique, audit, polish, simplify and harden interfaces. |
| `product-native-design` | A repeatable method for UI that feels specific to its product instead of a template. |
| `interface-design-foundations` | Tokens, hierarchy, typography, surfaces, motion, states and accessibility. |
| `make-interfaces-feel-better` | Interaction details that make an interface feel considered. |
| `transitions-dev` | Thirty-two production-ready CSS transitions with reduced-motion guards. |
| `transitions-polish` | Refine existing motion against a shared duration, distance and scale token scale. |
| `transitions-ui-generation` | Make a UI, headline or image look like an agent is generating it. |
| `react-native-motion` | Fluid, accessible React Native and Expo motion with Reanimated, Gesture Handler and Skia. |

### GSAP

| Skill | What it does |
| --- | --- |
| `gsap-core` | Core API: tweens, easing, duration, stagger and defaults. |
| `gsap-frameworks` | Vue, Svelte and other non-React lifecycles and cleanup. |
| `gsap-performance` | Transforms, batching and avoiding layout thrashing. |
| `gsap-plugins` | ScrollTo, ScrollSmoother, Flip, Draggable, Inertia and more. |
| `gsap-react` | The `useGSAP` hook, refs, context and cleanup. |
| `gsap-scrolltrigger` | Scroll-linked animations, pinning, scrub and triggers. |
| `gsap-timeline` | Timelines, the position parameter, nesting and playback. |
| `gsap-utils` | Clamp, mapRange, normalize, interpolate, random, snap, wrap and toArray. |

### Security and review

| Skill | What it does |
| --- | --- |
| `security-audit` | Security guidance and vulnerability review for codebases, APIs, services, CLIs and libraries. |

## Git rules

The full policy is `skills/git-discipline/SKILL.md`. The short version:

- Author and committer are both `qhmed67 <ahmedalmslm74@gmail.com>`. Set them
  per repository, never globally.
- One logical change per commit. Stage explicit paths, not `git add -A`.
- Conventional Commits by default; imperative subject, at most 72 characters,
  no trailing period, body wrapped at 72.
- No AI attribution: no `Co-authored-by`/`Generated-by` trailers, no "Generated
  with" phrases, no robot emoji, no model name as author.
- No secrets in a diff, a message, a URL or a config file.
- List outgoing commits with identity before pushing:

  ```sh
  git log --format='%h %an <%ae> | %cn <%ce> | %s' @{upstream}..HEAD
  ```

- Never force-push a shared branch. Never rewrite published history without an
  explicit instruction.
- Never use `--no-verify`. Fix the cause instead.

The hooks enforce part of this:

- `githooks/commit-msg` rejects empty and vague subjects, subjects over 72
  characters, attribution trailers, AI phrases and the robot emoji. It allows
  `docs: explain Claude Code setup`.
- `githooks/pre-push` checks both identities on every outgoing commit and blocks
  `github_pat_`, `ghp_`, `sk-` and `fc-` secret patterns.
- `githooks/identity` is the single source of truth for the identity. The
  installer copies it beside the installed hooks as `core-identity`.

## MCP prerequisites

| Server | Command | Requirement |
| --- | --- | --- |
| `playwright` | `npx @playwright/mcp@latest` | Node 18+, network access, a browser. Install browsers with `npx playwright install chromium` if the default is missing. |
| `firecrawl` | `npx -y firecrawl-mcp` | `FIRECRAWL_API_KEY` exported in the shell that starts the agent. |

```sh
node scripts/ensure-mcp.mjs --check --project .
node scripts/ensure-mcp.mjs --apply --project .
```

- `--check` exits `0` when both servers are present and enabled, `1` when one
  is missing or disabled and `2` when a file cannot be parsed safely.
- `--apply` adds only missing servers, enables a baseline server that is
  present but disabled, and never overwrites an unrelated entry.
- Existing servers are detected by command or package as well as by key.
- OpenCode v1 configs use `mcp.<name>` and `enabled`. OpenCode v2 configs use
  `mcp.servers.<name>` and `disabled`. The installed OpenCode version and the
  existing file shape decide which one is used.
- Claude Code uses `.mcp.json` with `mcpServers`.
- JSONC comments are parsed for `--check`, but `--apply` refuses to rewrite a
  file with comments so it cannot silently strip them. Edit that file manually
  using the shapes in `skills/mcp-baseline/SKILL.md`.
- The Firecrawl key is always a reference (`{env:FIRECRAWL_API_KEY}` for
  OpenCode, `${FIRECRAWL_API_KEY}` for Claude), never a value.

## Updating this repository

```sh
node scripts/validate-skills.mjs
node --check scripts/install.mjs
node --check scripts/ensure-mcp.mjs
node --check scripts/validate-skills.mjs
sh -n githooks/commit-msg
sh -n githooks/pre-push
```

Before committing installer changes, test in a temporary directory:

```sh
tmp=$(mktemp -d)
node scripts/install.mjs --project "$tmp" --target agents --mcp skip
node scripts/install.mjs --project "$tmp" --target agents --mcp skip
rm -rf "$tmp"
```

Test `--with-git-hooks` in a throwaway git repository and test `ensure-mcp.mjs`
against empty, v1, v2 and `.mcp.json` fixtures. Never test against a real
project with uncommitted work.

### Add a skill

1. Create `skills/<name>/SKILL.md` with `name` equal to the folder name and a
   description of at most 1024 characters.
2. Keep supporting files inside the folder and link them relatively.
3. Copy any upstream license into `licenses/` and add the URL, exact commit and
   license to `SOURCES.md`.
4. Run the validator, add the skill to the catalog above and install into a
   temporary project.
5. Commit the skill and its source record together.

### Update an imported skill

Re-import from the recorded commit, apply the same sanitization, then update the
commit SHA in `SOURCES.md`. Do not edit imported bodies for style. If an upstream
change is not wanted, record the decision instead of silently drifting.

### Change the installer

Keep the CLI flags, defaults and target roots in this README in sync with
`scripts/install.mjs`. Preserve idempotence, the manifest, the no-duplicate
target rule and the `--force` requirement for foreign skills and hooks.

## Access

The repository is private. Use an SSH key that is already on the machine:

```sh
git clone git@github.com:qhmed67/core.git core
```

Or use a one-shot token from an existing environment variable. The token stays
in memory, never in the remote URL or `.git/config`:

```sh
git -c credential.helper= \
  -c 'credential.helper=!f() { echo username=x-access-token; echo password=$GH_TOKEN; }; f' \
  clone https://github.com/qhmed67/core.git core
```

For an existing checkout, the same pattern works with `fetch` or `push`. Do not
run `git config --global`, do not embed a token in the remote, and do not ask
another person to paste a token into chat.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `install: Node.js 18 or newer is required` | Install Node 18+ and reopen the shell. |
| Installer chooses the wrong target | Pass `--target opencode`, `--target claude` or `--target agents` explicitly. |
| Skill is skipped as "not core-owned" | Another skill with that name exists. Move it aside or rerun with `--force`. |
| Second install reports updates instead of zero | The target was installed from a different checkout, or files changed. Inspect `.core-manifest.json`; this is not duplication. |
| `--mode link` breaks after moving the checkout | Reinstall from the new location, or use `--mode copy`. |
| `existing hook ...` during install | The project already has a hook. Rerun with `--force` to chain it, after reviewing it. |
| `ensure-mcp` exits `2` | The config has a syntax error or JSONC comments. Fix it manually; nothing was written. |
| Firecrawl tools fail at runtime | Export `FIRECRAWL_API_KEY` in the shell that launches the agent, then restart the agent. |
| Playwright cannot launch a browser | Run `npx playwright install chromium`. |
| Validator reports a description over 1024 characters | Shorten the description; keep the body intact. |
| Push is blocked by identity or secret checks | Fix the commit and rewrite it locally if it is unpublished. Do not bypass the hook. |
| `gh` is unavailable | Use SSH or the one-shot credential helper above. |
