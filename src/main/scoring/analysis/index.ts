/**
 * Flight analysis module exports
 */

// Main analyzer
export {
  analyzeFlightForTask,
  analyzeFlightFixes,
  parseIgcContent,
  readIgcFile,
} from "./flightAnalyzer";

// Turnpoint detection
export {
  findAllCrossings,
  getValidCrossings,
  reachedTurnpoint,
  getLastReachedTurnpoint,
} from "./turnpointDetector";

// Distance calculation
export {
  calculateFlownDistance,
  calculateDistanceToGoal,
  calculateDistanceToTurnpoint,
  calculateBonusDistance,
} from "./distanceCalculator";

// Time-distance graph
export {
  generateTimeDistanceGraph,
  calculateSpeedSectionTime,
  calculateSpeedSectionSpeed,
} from "./timeDistanceGraph";
