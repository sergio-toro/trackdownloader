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

// Analysis
export {
  analyzeFlightForTask,
  analyzeFlightFixes,
  parseIgcContent,
  readIgcFile,
  findAllCrossings,
  getValidCrossings,
  reachedTurnpoint,
  getLastReachedTurnpoint,
  calculateFlownDistance,
  calculateDistanceToGoal,
  calculateDistanceToTurnpoint,
  calculateBonusDistance,
  generateTimeDistanceGraph,
  calculateSpeedSectionTime,
  calculateSpeedSectionSpeed,
} from "./analysis";

// Core calculations
export {
  calculateTaskStatistics,
  updateStatsWithLeadingCoeffs,
  calcTimeValidity,
  calcLaunchValidity,
  calcDistanceValidity,
  calcStopValidity,
  calcDayQuality,
  calculateAllValidities,
  calculateWeights,
  applyGap2023Adjustments,
  applyGap2025Adjustments,
  calculateAvailablePoints,
  calculateLinearDistanceThreshold,
} from "./core";

// Leading coefficient calculators
export {
  calculateClassicLC,
  calculatePwc2019LC,
  calculatePwc2023LC,
  calculateLeadingCoeff,
  calculateTaskLcMin,
} from "./leading";
export type {
  LeadingCalculatorResult,
  LeadingCalculatorOptions,
} from "./leading";

// Point calculations
export {
  calculateDistancePoints,
  calculateDifficultyCoefficient,
  calculateTimePoints,
  calcTimeFraction,
  calculateArrivalPoints,
  getFinishPosition,
  calcArrivalFraction,
  calculateLeadingPoints,
  calcLeadingFraction,
  calculateLeadingPointsFromLcResult,
} from "./points";

// Task scoring
export { scoreTask, scoreSinglePilot } from "./scoring";
export type { ScoringOptions } from "./scoring";

// FTV Calculator
export {
  calculateCompetitionStandings,
  calculateSimpleStandings,
  getPilotTaskResult,
} from "./scoring/ftvCalculator";

// Export
export {
  exportToCsv,
  taskResultToCsv,
  standingsToCsv,
  exportToHtml,
  generateHtmlPreview,
} from "./export";
export type {
  CsvExportOptions,
  CsvExportResult,
  HtmlExportOptions,
} from "./export";
