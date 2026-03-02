/**
 * Scoring module entry point
 *
 * Re-exports all types, storage, and IPC registration
 */

// Types
export * from "./types";

// Storage
export { createStorage, FileCompetitionStorage } from "./storage";
export type { ICompetitionStorage } from "./storage";

// IPC
export { default as registerScoringIpc } from "./ipc/registerScoringIpc";
export type { ScoringMethods } from "./ipc/scoringPreload";
