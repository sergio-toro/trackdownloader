# Claude Code Instructions

## Architecture

Electron app with main/renderer process separation via IPC. See `docs/architecture/`:
- `dependency-graph.md` - module dependencies between main/renderer processes
- `data-flow.md` - how data flows from file import through scoring
- `ipc-channels.md` - IPC channel naming and communication patterns

**Architecture changes must always be documented with diagrams.**

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main contect window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problens, throw more compute at it via subagents
- One tack per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
- **Always launch the app and test UI changes visually** — `npm run start` (background), then use Electron MCP tools to verify the UI renders correctly. TypeScript type checks do NOT catch runtime errors like null access in conditional renders.

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, chvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Inpact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.


## Before Committing Changes

Always run linting, type checking and tests before committing:

```bash
yarn lint
yarn typecheck
yarn test
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
pkill -f "trackdownloader/node_modules"
```

This kills all processes spawned from this project (Electron, helpers, webpack dev server). After killing, the background task will also complete.

## Data Safety

**NEVER delete app cache, user settings, configuration files, or stored data without explicitly asking the user first.** If an action would remove or overwrite user data (e.g., clearing localStorage, deleting `data/` folders, resetting config), always prompt the user before proceeding.

## Screenshots

Save Electron MCP screenshots to `.electron-mcp/` directory. This directory is gitignored.

## Electron MCP Navigation

Tested navigation commands for the running app (use after `npm run start`):

```
# Competition list → Competition detail
click_by_text: "Sergio Competition" (or any competition name)

# Competition tabs
click_by_text: "Standings" | "Results" | "Tasks" | "Participants"

# Tasks tab → Task detail view (click the task CARD, not "View Results")
click_by_selector: ".grid .bg-white.rounded-lg.border.cursor-pointer"

# Task detail tabs
click_by_text: "Info" | "Participants" | "Results"

# Task participant action buttons
click_by_selector: "button[title='Preview track']"      # 2D preview
click_by_selector: "button[title='3D track view']"       # 3D preview

# Back navigation
click_by_text: "Back to Sergio Competition"
click_by_text: "Back to Competitions"
```
