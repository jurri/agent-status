# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Elgato Stream Deck plugin (Node.js, TypeScript) that shows the status of a coding agent (Claude Code, Codex, etc.) as a Stream Deck key icon. It has no UI of its own beyond the Stream Deck app — it runs as a background Node process launched by the Stream Deck software and talks to it over the `@elgato/streamdeck` SDK, not directly to hardware.

Plugin UUID: `com.jurri.agent-status`. Action UUID: `com.jurri.agent-status.status`.

## Commands

```shell
npm install
npm run build      # rollup -c, bundles src/plugin.ts -> sdPlugin/bin/plugin.js
npm run watch       # rollup -c -w, rebuild on change
npm run validate    # streamdeck validate <sdPlugin folder> — checks manifest.json correctness
npm run link        # streamdeck link <sdPlugin folder> — registers the plugin with the local Stream Deck app
npm run restart     # streamdeck restart com.jurri.agent-status — reloads the running plugin process
npm run pack        # streamdeck pack <sdPlugin folder> --force — builds a distributable .streamDeckPlugin
```

There is no test suite or linter configured. After changing plugin code, the real verification loop is: `npm run build`, then `npm run validate`, then `npm run restart`, then check the logs (see below).

To exercise the action without a real coding agent, write to the status file directly:

```shell
npm run set:working
npm run set:idle
npm run set:waiting
npm run set:error
npm run set:offline
```

These invoke `scripts/set-status.mjs <state>`, which writes `~/.agent-status.json`.

## Architecture

- **`src/plugin.ts`** — entry point. Sets log level to debug, registers `AgentStatusAction`, calls `streamDeck.connect()`. Wraps startup in try/catch and hooks `uncaughtException`/`unhandledRejection` so failures show up in the plugin log instead of silently killing the process.
- **`src/actions/agent-status.ts`** — the only real action, `AgentStatusAction`. On `onWillAppear` it starts a 1500ms polling loop that rereads a JSON status file and re-renders the key. States (`idle`/`working`/`waiting`/`error`/`offline`) map to a color and short label; the key face is a hand-built SVG data URI (not a static image asset), embedding agent name, state label, and message text (XML-escaped).
  - Status file defaults to `~/.agent-status.json`, overridable per-action via the `statusFile` setting (supports `~/` and `%USERPROFILE%` expansion).
  - `onKeyDown` optionally runs a detached shell command from the `pressCommand` setting (fire-and-forget, no output captured).
  - Missing file, unreadable JSON, or an unrecognized `state` value all degrade to a visible error/offline state rather than throwing.
- **`com.jurri.agent-status.sdPlugin/`** — the actual plugin bundle Stream Deck loads: `manifest.json` (action registration, icons, supported OS/software versions), `bin/` (build output, gitignored), `ui/inspector.html` (Property Inspector — plain HTML/JS using `sdpi-components`, edits the `statusFile`/`pressCommand` settings), `imgs/`, `logs/` (gitignored).
- **`scripts/set-status.mjs`** — standalone Node script (not bundled by rollup) for manually writing the status file during development.
- The status file contract is the integration point for external agents/scripts:
  ```json
  { "agent": "Claude", "state": "working", "message": "coding", "updatedAt": "2026-06-30T12:00:00.000Z" }
  ```

## Known inconsistencies (from an incomplete rename)

The plugin was renamed from an earlier `com.jaydee.*` identifier to `com.jurri.*`, and the rename wasn't applied everywhere:

- `rollup.config.mjs`'s `pluginFolder` constant still points at `com.jaydee.agent-status.sdPlugin`, while the actual bundle folder in this repo is `com.jurri.agent-status.sdPlugin`. Building without fixing this would emit `bin/plugin.js` into a new, wrong folder instead of the real plugin bundle.
- The `@action({ UUID: ... })` decorator in `src/actions/agent-status.ts` still uses `com.jaydee.agent-status.status`, but `manifest.json` declares the action UUID as `com.jurri.agent-status.status`. These must match for Stream Deck to route key events to the action.
- `README.md` documents the action UUID as `com.jaydee.agent-status.status` and the install path as `agentstatus\agent-status` — both stale.

When touching build config, the action UUID, or docs, fix the `com.jurri` vs `com.jaydee` mismatch rather than propagating it further.

## Other things to know

- `src/actions/increment-counter.ts` is leftover scaffolding from the `@elgato/streamdeck` project template. It is not imported in `plugin.ts` and its UUID is not listed in `manifest.json`'s `Actions` — it's dead code, not a second live action.
- `manifest.json` references `imgs/actions/status/icon.png` and `imgs/actions/status/key.png` for the status action, but only the unused counter template's icons exist under `imgs/actions/counter/`. These status icons are missing from the repo.
- Logs: Stream Deck app logs live at `%APPDATA%\Elgato\StreamDeck\logs\`; plugin-specific debug output (this plugin runs with `Nodejs.Debug: enabled`) surfaces there too. When something breaks, check these logs plus `npm run validate` / `npm run build` output first.
