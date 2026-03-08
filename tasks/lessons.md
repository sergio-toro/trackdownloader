# Lessons Learned

## Runtime null access in React components
**Date**: 2026-03-08
**Error**: `Cannot read properties of null (reading 'taskTracks')` — called `getTrack(previewParticipant!)` unconditionally on every render when `previewParticipant` was `null`.
**Root cause**: Used TypeScript non-null assertion (`!`) to silence the compiler instead of adding a proper null guard.
**Rule**: Never use `!` non-null assertion on state that can be null. Always guard with a conditional. TypeScript `--noEmit` won't catch runtime null access through `!`.
**Rule**: Always launch the app (`npm run start`) and test UI changes visually after implementation. Lint + typecheck + unit tests are not sufficient for UI components.
