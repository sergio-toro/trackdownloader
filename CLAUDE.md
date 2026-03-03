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

## Unused Variables

Prefix intentionally unused variables with `_` (e.g., `_formula`, `_options`).

## Screenshots

Save Electron MCP screenshots to `.electron-mcp/` directory. This directory is gitignored.
