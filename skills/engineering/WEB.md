# Web and browser access

Use the cheapest tool that answers the question. Move down the list only when
the one above cannot.

## 1. Built-in fetch and search

The agent's own web fetch and web search tools. Best for docs, articles, API
references, release notes. One call, text back.

## 2. curl plus filters

For APIs, JSON, raw files and anything static.

```sh
curl -sSL <url> | jq '.items[] | {name, version}' | head -40
curl -sSL <url> | rg -n 'pattern' | head -20
```

HTML to text, if installed (check with `command -v`): `pandoc -f html -t plain`,
`lynx -dump`, `w3m -dump`. Otherwise filter with `rg` and `sed -n`. Never print a
whole page.

## 3. Browser, only when needed

Use it when the page needs JavaScript, a login, or interaction, or when you must
verify a UI or run an end-to-end test. Use `playwright-cli` (Microsoft's CLI for
coding agents). It keeps snapshots and screenshots on disk, so only what you
read enters the context.

```sh
command -v playwright-cli || npx playwright-cli --help | head -30   # find it, learn it once
playwright-cli open <url>        # headless; --headed only if the owner asks
playwright-cli snapshot          # page structure to a file; read it with rg or head
playwright-cli click <ref>       # refs come from the snapshot
playwright-cli type "text"
playwright-cli press Enter
playwright-cli screenshot        # only for a layout or visual question
playwright-cli close
```

Run `playwright-cli --help` once for anything not listed. Do not guess flags.
It needs Node 20 or newer. A missing browser is a download: run
`playwright-cli install` and mention it under Needs you.

Rules:

- Plan the steps before the first `open`. One session per task. Reuse it.
- Never `open` the same URL twice. Never loop snapshot, screenshot, snapshot.
- Read snapshots with `rg`/`head`, not whole. Look at a screenshot only when the question is visual.
- Two failures on the same step: stop and report what the page showed.
- `close` the session when done.

## 4. Not part of this setup

- Browser MCP servers (Playwright MCP, others). Their tool schemas load every session, and page trees come back into the context. Do not use them even if configured, unless the owner asks.
- Firecrawl. It needs `FIRECRAWL_API_KEY`. Check with `[ -n "$FIRECRAWL_API_KEY" ]`, never print it. No key, no attempt.
