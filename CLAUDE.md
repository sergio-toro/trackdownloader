# Claude Code Instructions

## Architecture

Electron app with main/renderer process separation via IPC. See `docs/architecture/`:
- `dependency-graph.md` - module dependencies between main/renderer processes
- `data-flow.md` - how data flows from file import through scoring
- `ipc-channels.md` - IPC channel naming and communication patterns

**Architecture changes must always be documented with diagrams.**

## Before Committing Changes

Always run linting and type checking before committing:

```bash
npm run lint
npx tsc --noEmit
```

## Auto-fix Linting Issues

Many linting issues (especially formatting) can be auto-fixed:

```bash
npm run lint -- --fix
```

## Scripts

Use JavaScript `.mjs` files for standalone scripts.

## Unused Variables

Prefix intentionally unused variables with `_` (e.g., `_formula`, `_options`).

## Running the App

Start the Electron app in development mode (with hot reload):

```bash
npm run start
```

Use `run_in_background: true` when launching via the Bash tool. The app runs on webpack dev server port 3000 with remote debugging on port 9222 (for Electron MCP tools).

To kill the app:

```bash
pkill -f "electron.*trackdownloader"
```

This kills all Electron processes for this project. After killing, the background task will also complete.

## Screenshots

Save Electron MCP screenshots to `.electron-mcp/` directory. This directory is gitignored.
