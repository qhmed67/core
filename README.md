# If you are an AI agent, do exactly this

You are reading the canonical `core` repository. Do not improvise a layout, an installer or an MCP shape.

1. Read `AGENTS.md` and `SOURCES.md` before changing anything.
2. Confirm you are in a clone of `qhmed67/core`: `git remote get-url origin`, `git status --short`. Unexpected changes: stop and report.
3. Validate: `node scripts/validate-skills.mjs` and `node scripts/test-plugin.mjs`. Stop if either fails.
4. Choose one task:
   - **Install into a project:** `node scripts/install.mjs --project <path> --with-git-hooks`
   - **Global target:** `node scripts/install.mjs --scope global --target claude --mode link`
   - **Use a skill without installing:** read `skills/<name>/SKILL.md` and follow it.
   - **Change this repository:** follow `AGENTS.md`.
5. After an install, verify: `node scripts/ensure-mcp.mjs --check --project <path>` and `node -e "const m=require('<target-root>/.core-manifest.json'); console.log(m.commit, m.skills.length)"`.
6. Never create a `.env`, print an environment variable or put a token in a URL, config file or commit. Tokens are referenced by name only (`GH_TOKEN`).
7. Report exactly what you ran, the target root, the skill count, the rules and MCP result, and anything skipped. On failure, stop and report. Do not switch to a manual install.

---

# core

One owner's agent setup: four skills, git hooks, an OpenCode guard plugin and a small installer. No dependencies, no build step. Node 18+.

Goal: consistent output, few tokens, no guessing, no surprise pushes, no agent files in the repository.

## What is in the box

| Part | Purpose | Token cost |
| --- | --- | --- |
| `skills/caveman` | Medium reply style and a fixed report: Happened, Architecture, Next, Needs you, Verified | description only until loaded |
| `skills/engineering` | No guessing, architecture first, human code and comments, real-value tests plus end-to-end, Linux Mint terminal, web access. `SLOP.md`, `WEB.md`, `SECURITY.md` (OWASP Top 10:2025, condensed) and `CONTEXT.md` (project context interview) load on demand | same |
| `skills/design` | One design skill: method, tokens, states, motion, RTL, React Native | same |
| `skills/git-discipline` | Identity, message style, agent-file hygiene, PR body, push limits, token use. `WRITING.md` loads on demand | same |
| `extras/security-audit` | Large security audit skill. Install with `--extras` | not installed by default |
| `templates/rules.md` | Always-on block written into the project's `AGENTS.md` (or `CLAUDE.md`), 20 lines at most | always loaded, about 600 tokens |
| `plugins/core-guard.js` | OpenCode plugin: blocks hook bypasses, agent-file staging, `CORE_ALLOW_*` overrides and `.env` reads, keeps `.agent/state.md` through compaction | zero |
| `githooks/` | `pre-commit`, `commit-msg` and `pre-push` enforce agent-file hygiene, identity, message style, size, secrets | zero |
| `scripts/ensure-mcp.mjs` | Checks MCP servers and warns about the expensive ones. Adds a server only on request | zero |

Why a rules block: a skill is loaded by judgment and can be skipped. The block
guarantees the reply style, the no-guessing rule, the report format and the git
rules in every session, so nothing has to be switched on.

## Quick start

```sh
git clone git@github.com:qhmed67/core.git core
cd core
node scripts/validate-skills.mjs
node scripts/install.mjs --project ../my-app --with-git-hooks
```

### Installer options

| Option | Values | Default | Meaning |
| --- | --- | --- | --- |
| `--project <dir>` | path | cwd | Project to install into. |
| `--scope <scope>` | `project`, `global` | `project` | Project-local or home-directory target. |
| `--target <target>` | `auto`, `opencode`, `claude`, `agents` | `auto` | Agent convention. |
| `--mode <mode>` | `copy`, `link` | `copy` | Copy folders or symlink to this checkout. |
| `--with-git-hooks` | flag | off | Install `commit-msg` and `pre-push` into `.git/hooks`. |
| `--extras` | flag | off | Also install `extras/` skills. |
| `--rules <action>` | `apply`, `skip` | `apply` | Write or refresh the rules block. |
| `--plugins <action>` | `apply`, `skip` | `apply` | Install the guard plugin (`opencode` target only). |
| `--mcp <action>` | `check`, `apply`, `skip` | `check` | Report MCP servers and warnings. `apply` adds nothing unless `ensure-mcp.mjs --servers` is used directly. |
| `--force` | flag | off | Replace conflicting skills and chain existing hooks. |

Target roots: `opencode` `.opencode/skills`, `claude` `.claude/skills`, `agents` `.agents/skills` (global: `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills`).

Rules file: `AGENTS.md` for `opencode` and `agents`; `CLAUDE.md` for `claude` (or `AGENTS.md` when `CLAUDE.md` imports it). Global: `~/.claude/CLAUDE.md`, `~/.config/opencode/AGENTS.md`, none for `agents`. Only the text between `<!-- core:begin -->` and `<!-- core:end -->` is managed.

The installer also writes the agent paths (`.opencode/`, `.claude/`, `AGENTS.md`, `opencode.json`, `.mcp.json` and the rest of `CORE_AGENT_PATHS`) to `.git/info/exclude`, so an agent cannot commit them by accident. The file is local to the clone and is never committed.

Guarantees: idempotent; one target per run; manifest at `<target>/.core-manifest.json`; foreign skills skipped unless `--force`; core-owned skills removed from this repo are pruned; `--mode link` needs the checkout to stay where it is.

## Git policy and hooks

Full policy: `skills/git-discipline/SKILL.md`. Limits live in `githooks/identity`.

| Hook | Enforces |
| --- | --- |
| `pre-commit` | Newly added agent or tool files (`CORE_AGENT_PATHS`), at any depth. Tracked ones may still be edited. Then prints an `aislop` scan of staged files if `aislop` is installed. The scan never blocks. |
| `commit-msg` | No AI attribution. No vague or empty subject. Filler words (`CORE_BANNED_WORDS`). Body of 12 lines at most. 72 characters. Conventional Commits. At most 15 files and 500 changed lines per commit. |
| `pre-push` | Author and committer of every outgoing commit. Secret patterns (`github_pat_`, `ghp_`, `sk-`, `fc-`) in added lines. At most 8 commits, 40 files, 1500 changed lines per push. Optional protected branches. |

Change a limit by editing `githooks/identity` and reinstalling. A deliberate large
commit needs the owner to run it with `CORE_ALLOW_LARGE=1`. Tracking an agent file on
purpose needs `CORE_ALLOW_AGENT_FILES=1`. Agents never set either; the guard plugin
blocks any `CORE_ALLOW_*=` assignment.

## OpenCode guard plugin and task state

`plugins/core-guard.js` is installed to `.opencode/plugins/` (global: `~/.config/opencode/plugins/`) for the `opencode` target. It has two jobs.

**1. Blocks commands before they run** (`tool.execute.before`). The agent gets an error and the reason:

| Blocked | Why |
| --- | --- |
| `git ... --no-verify`, `git commit -n`, `-c core.hooksPath=...` | Git hooks cannot stop their own bypass. |
| `git push --force`, `-f`, `--force-with-lease`, `+ref` | Policy: never force-push from an agent. |
| `git add -A`, `--all`, `.`, `*` | Stage explicit paths. |
| `git add` of an agent or tool file (`.opencode`, `.claude`, `AGENTS.md`, `.mcp.json` ...) | Agent files stay out of the repository. |
| `CORE_ALLOW_*=...` | Overrides belong to the owner. |
| Editing or deleting `.git/hooks` | Keeps the hooks in place. |
| `printenv`, bare `env`, reading `.env` / `.env.*` (not `.env.example`) | No secrets in context. |

There is no override for the agent. A human who really needs one runs the command in a normal terminal.

**2. Keeps task state through compaction** (`experimental.session.compacting`). If `.agent/state.md` exists, up to 3000 characters of it are added to the compaction summary.

`.agent/state.md` is the whole session memory: the agent reads it at session start and overwrites it after each task (20 lines: goal, done, next, decisions, open). The installer adds `.agent/` to `.git/info/exclude`, so it stays out of git without touching tracked files. If the state disagrees with the code, the code wins.

Check it: `node scripts/test-plugin.mjs` exercises the rules and the compaction hook without OpenCode. Then try one blocked command (`git add .`) inside OpenCode to confirm your version loads the plugin. The compaction hook is marked experimental upstream and may change.

## Browser, web and MCP

No MCP server is required. A browser MCP loads its tool schemas into every
session and returns page trees into the context, and Firecrawl fails without its
key. The order of tools lives in `skills/engineering/WEB.md`: built-in fetch and
search, then `curl`, then `playwright-cli` only for JavaScript pages and UI checks.

```sh
npm install -g @playwright/cli@latest     # Node 20 or newer
playwright-cli install                    # downloads a browser
```

```sh
node scripts/ensure-mcp.mjs --check --project .
node scripts/ensure-mcp.mjs --apply --project . --servers firecrawl   # opt in
node scripts/ensure-mcp.mjs --remove --project .                      # delete playwright and firecrawl, keeps a backup
node scripts/ensure-mcp.mjs --remove --target claude --file ~/.claude.json
node scripts/ensure-mcp.mjs --remove --target opencode --file ~/.config/opencode/opencode.json
```

`--check` exits 0 when everything requested is present, 1 when a requested
server is missing, 2 when a file cannot be parsed safely. It prints a warning for
a configured Playwright MCP, and for Firecrawl when `FIRECRAWL_API_KEY` is not
set. `--apply` adds only what `--servers` names, never overwrites an unrelated
entry, and refuses to rewrite a JSONC file that has comments. The key is always a
reference, never a value. A project file's backup goes to `.agent/mcp-backup/`, a global file's next to it as `.core-bak`. By default the script reads the project config only. Use
`--file` with `--target` for a global config (`~/.config/opencode/opencode.json`,
`~/.claude.json`). It does not touch Claude Code's per-project entries inside
`~/.claude.json`; check those by hand.

## Code quality tooling

`skills/engineering/SLOP.md` lists the patterns and the scanner. `aislop`
(MIT, deterministic, runs locally) is the one the setup points to. It is not
vendored. Install it yourself (`npm install -g aislop`) and the `pre-commit`
hook starts printing its findings. It has telemetry on by default; the hook and
the skill set `AISLOP_NO_TELEMETRY=1`.

## Layout

```
skills/                 caveman, design, engineering, git-discipline
extras/                 optional skills (security-audit)
templates/rules.md      always-on rules block
githooks/               identity, pre-commit, commit-msg, pre-push
plugins/                core-guard.js (OpenCode)
scripts/                install.mjs, ensure-mcp.mjs, validate-skills.mjs, test-plugin.mjs, wrappers
licenses/               licenses of upstream projects still used
AGENTS.md               rules for agents working on this repo
SOURCES.md              origin, commit, license, treatment of everything derived
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Node.js 18 or newer is required` | Install Node 18+. |
| Wrong target chosen | Pass `--target`. |
| Skill skipped as "not core-owned" | Move the existing one aside or use `--force`. |
| `existing hook ...` | Review it, then rerun with `--force` to chain it. |
| Commit or push blocked as too large | Split it. The owner may use `CORE_ALLOW_LARGE=1` once. |
| `commit-msg` rejects the subject | Use `type(scope): subject`. |
| `commit-msg`: filler words or body too long | Say what changed. Keep the body to the why, 12 lines at most. |
| `pre-commit`: agent or tool files must not be added | `git restore --staged <path>`. The owner may use `CORE_ALLOW_AGENT_FILES=1`. |
| `core-guard blocked this` | The command bypasses the git policy or reads a secret. Run it yourself if you really need it. |
| Plugin does nothing in OpenCode | Check that `.opencode/plugins/core-guard.js` exists and your OpenCode version loads local plugins. |
| `ensure-mcp` exits 2 | Fix the syntax error or JSONC comments by hand. |
| Agent keeps opening a browser | Remove a Playwright MCP entry from the project and global config. Use `playwright-cli`. |
