# Lessons Learned

## Runtime null access in React components
**Date**: 2026-03-08
**Error**: `Cannot read properties of null (reading 'taskTracks')` — called `getTrack(previewParticipant!)` unconditionally on every render when `previewParticipant` was `null`.
**Root cause**: Used TypeScript non-null assertion (`!`) to silence the compiler instead of adding a proper null guard.
**Rule**: Never use `!` non-null assertion on state that can be null. Always guard with a conditional. TypeScript `--noEmit` won't catch runtime null access through `!`.
**Rule**: Always launch the app (`npm run start`) and test UI changes visually after implementation. Lint + typecheck + unit tests are not sufficient for UI components.

## MapLibre GL JS: line-elevation-reference is Mapbox-only
**Date**: 2026-03-11
**Error**: `unknown property "line-elevation-reference"` and `unknown property "line-z-offset"` in MapLibre GL JS v5.19.0.
**Root cause**: `line-elevation-reference` and `line-z-offset` are Mapbox GL JS v3.8+ proprietary features, NOT available in MapLibre. Research gave incorrect information initially.
**Rule**: MapLibre line layers always drape on terrain when `setTerrain()` is active — there is NO style-spec property to prevent this. To render lines at GPS altitude above 3D terrain, use a Three.js custom layer (`type: 'custom', renderingMode: '3d'`) with `MercatorCoordinate.fromLngLat(lngLat, altitude)` for correct 3D positioning.
**Rule**: Always check the Electron console logs (`read_electron_logs`) after testing a new MapLibre feature — unknown property errors are logged there, not visible in the UI.
