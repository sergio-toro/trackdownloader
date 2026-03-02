/**
 * Point calculation functions
 *
 * Re-exports all point calculation functions.
 */

// Distance points
export {
  calculateDistancePoints,
  calculateDifficultyCoefficient,
} from "./distancePoints";

// Time points
export { calculateTimePoints, calcTimeFraction } from "./timePoints";

// Arrival points
export {
  calculateArrivalPoints,
  getFinishPosition,
  calcArrivalFraction,
} from "./arrivalPoints";

// Leading points
export {
  calculateLeadingPoints,
  calcLeadingFraction,
  calculateLeadingPointsFromLcResult,
} from "./leadingPoints";
