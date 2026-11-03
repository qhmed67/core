---
name: mcp-baseline
description: Ensure a project has the baseline Playwright and Firecrawl MCP servers configured, using the core repository's ensure-mcp script or the documented v1, v2 and .mcp.json shapes. Use at the start of work in any project, when MCP tools are missing, or when onboarding a repository.
---

# MCP baseline

Every project gets the same two MCP servers:

| Server | Command | Credential |
| --- | --- | --- |
| `playwright` | `npx @playwright/mcp@latest` | None. Node 18 or newer. |
| `firecrawl` | `npx -y firecrawl-mcp` | `FIRECRAWL_API_KEY`, referenced by name only. |

Never inline a key. Never print a key. Never create a `.env` file for the agent.

## Start of work

1. Locate the core repository checkout. If this skill was installed by
   `scripts/install.mjs`, the target's `.core-manifest.json` records a `source`
   path; try that first. Otherwise ask the user for the checkout path.
2. Run the check from the core checkout:

   ```sh
   node <core-checkout>/scripts/ensure-mcp.mjs --check --project <project>
   ```

3. If the check reports missing servers, apply them:

   ```sh
   node <core-checkout>/scripts/ensure-mcp.mjs --apply --project <project>
   ```

4. If `FIRECRAWL_API_KEY` is unset, tell the user to export it in the shell that
   launches the agent. Do not ask for the value in chat and do not write it to a
   file. If it is set, say so without printing it.
5. Re-run `--check` after applying and confirm both servers are present.

If the script cannot run, configure the servers manually using the shape that
matches the project. Do not guess.

## Shape 1: OpenCode v1

File: `opencode.json` or `opencode.jsonc` in the project root, or
`.opencode/opencode.json(c)`.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["npx", "@playwright/mcp@latest"],
      "enabled": true
    },
    "firecrawl": {
      "type": "local",
      "command": ["npx", "-y", "firecrawl-mcp"],
      "enabled": true,
      "environment": {
        "FIRECRAWL_API_KEY": "{env:FIRECRAWL_API_KEY}"
      }
    }
  }
}
```

OpenCode v1 uses `mcp.<name>` and `enabled`. The current `opencode --version`
decides which shape applies.

## Shape 2: OpenCode v2

Same file locations. OpenCode v2 uses `mcp.servers.<name>` and `disabled`, not
`enabled`. Environment substitution is still `{env:NAME}`.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "playwright": {
        "type": "local",
        "command": ["npx", "@playwright/mcp@latest"]
      },
      "firecrawl": {
        "type": "local",
        "command": ["npx", "-y", "firecrawl-mcp"],
        "environment": {
          "FIRECRAWL_API_KEY": "{env:FIRECRAWL_API_KEY}"
        }
      }
    }
  }
}
```

If the installed OpenCode is v2, do not write v1's flat `mcp.<name>` shape.

## Shape 3: Claude Code `.mcp.json`

File: `.mcp.json` in the project root.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}"
      }
    }
  }
}
```

## Safety rules

- Detect an existing server by its command or package, not only by its key.
  Another key that already runs `@playwright/mcp` or `firecrawl-mcp` satisfies
  the baseline.
- Add only what is missing. Never overwrite an unrelated entry that happens to
  share a name.
- Never replace a whole config file. Merge into the parsed object and write it
  back only when the file is safe to parse.
- If the file is JSONC with comments or the parse is ambiguous, stop and tell
  the user which file needs a manual edit. Do not strip comments silently.
- Never store the Firecrawl value. The config contains only the variable
  reference.
- After applying, report the file path and the server names added. Do not echo
  the config or any environment value.
