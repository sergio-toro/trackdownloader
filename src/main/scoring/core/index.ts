/**
 * Core scoring calculations
 *
 * Re-exports all core scoring functions:
 * - Task statistics calculation
 * - Validity calculations
 * - Weight distribution
 */

// Task statistics
export {
  calculateTaskStatistics,
  updateStatsWithLeadingCoeffs,
} from "./taskStatistics";

// Validity calculations
export {
  calcTimeValidity,
  calcLaunchValidity,
  calcDistanceValidity,
  calcStopValidity,
  calcDayQuality,
  calculateAllValidities,
} from "./validity";

// Weight distribution
export {
  calculateWeights,
  calculateAvailablePoints,
  calculateLinearDistanceThreshold,
} from "./weights";
