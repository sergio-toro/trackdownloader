/**
 * Point weight distribution for GAP scoring
 *
 * Based on FS GAP.cs lines 508-596.
 * Calculates how the available points are distributed across categories.
 */

import type {
  TaskStatistics,
  PointWeights,
  AvailablePoints,
} from "../types/results";
import type { ScoringFormulaConfig } from "../types/formula";

/**
 * Calculate point weight distribution (GAP.cs lines 508-578)
 *
 * Points are distributed based on how many pilots reached goal.
 * The algorithm differs depending on formula flags (useConstantLeadingWeight, etc.)
 *
 * @param stats Task statistics
 * @param formula Scoring formula configuration
 * @returns Point weights (sum to 1)
 */
export function calculateWeights(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig
): PointWeights {
  const { pilotsFlying, pilotsInGoal, pilotsReachedESS } = stats;
  const goalRatio = pilotsFlying > 0 ? pilotsInGoal / pilotsFlying : 0;
  const gr = goalRatio;

  // Distance weight (GAP.cs:519-533) — different polynomial when constant leading weight
  let distanceWeight = 0;
  if (formula.useDistancePoints) {
    if (formula.useConstantLeadingWeight) {
      distanceWeight =
        pilotsInGoal === 0
          ? 0.838
          : 0.805 - 1.374 * gr + 1.413 * gr * gr - 0.484 * gr * gr * gr;
    } else {
      distanceWeight =
        0.9 - 1.665 * gr + 1.713 * gr * gr - 0.587 * gr * gr * gr;
    }
  }

  // Dummy arrival weight (GAP.cs:537-548)
  const dummyArrWeight = (1 - distanceWeight) / 8;

  // Arrival weight — only if pilots reached ESS (GAP.cs:552-557)
  let arrivalWeight = 0;
  if (formula.useArrivalPoints && pilotsReachedESS > 0) {
    arrivalWeight = dummyArrWeight;
  }

  // Departure weight (GAP.cs:559-563)
  let departureWeight = 0;
  if (formula.useDeparturePoints && pilotsReachedESS > 0) {
    departureWeight = dummyArrWeight * 1.4;
  }

  // Leading weight (GAP.cs:566-568, calls CalculateLeadingWeight)
  let leadingWeight = 0;
  if (formula.useLeadingPoints) {
    leadingWeight = calculateLeadingWeight(
      stats,
      formula,
      distanceWeight,
      dummyArrWeight
    );
  }

  // Time weight = remainder (GAP.cs:572-578)
  let timeWeight = 0;
  if (formula.useTimePoints) {
    timeWeight =
      1 - distanceWeight - arrivalWeight - departureWeight - leadingWeight;
  }

  return {
    distanceWeight: Math.max(0, distanceWeight),
    timeWeight: Math.max(0, timeWeight),
    arrivalWeight: Math.max(0, arrivalWeight),
    leadingWeight: Math.max(0, leadingWeight),
    departureWeight: Math.max(0, departureWeight),
  };
}

/**
 * Calculate leading weight (FS GAP.cs:620-648)
 *
 * Different formula paths depending on configuration flags:
 * 1. useConstantLeadingWeight → fixed 0.162
 * 2. useProportionalLeadingWeightIfNobodyInGoal (no goal) → min(bestDist/taskDist * 0.1, 0.1)
 * 3. useLeadingTimeRatio → (1 - distWeight) * (noGoal ? 1 : leadingFraction)
 * 4. Fallback → dummyArrWeight * 1.4 * leadingWeightFactor
 */
function calculateLeadingWeight(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig,
  distanceWeight: number,
  dummyArrWeight: number
): number {
  // Path 1: Fixed constant (GAP.cs:624-626)
  if (formula.useConstantLeadingWeight) {
    return 0.162;
  }

  // Path 2: Proportional when nobody in goal (GAP.cs:630-632)
  if (
    stats.pilotsInGoal === 0 &&
    formula.useProportionalLeadingWeightIfNobodyInGoal
  ) {
    const taskDist = stats.taskDistance || 1;
    return Math.min((stats.bestDistance / taskDist) * 0.1, 0.1);
  }

  // Path 3: Leading time ratio (GAP.cs:636-638)
  if (formula.useLeadingTimeRatio) {
    const ltr = stats.pilotsInGoal === 0 ? 1 : formula.leadingFraction;
    return (1 - distanceWeight) * ltr;
  }

  // Path 4: Fallback with dummy_arr_weight (GAP.cs:642)
  return dummyArrWeight * 1.4 * formula.leadingWeightFactor;
}

/**
 * Calculate available points per category (GAP.cs lines 738-748)
 *
 * FS rounds each category individually, then computes time as remainder:
 *   distAvail  = round(1000 * dq * distWeight, 1)
 *   leadAvail  = round(1000 * dq * leadWeight, 1)
 *   arrAvail   = round(1000 * dq * arrWeight, 1)
 *   depAvail   = round(1000 * dq * depWeight, 1)
 *   timeAvail  = round(1000 * dq, 1) - distAvail - leadAvail - arrAvail - depAvail
 *
 * @param weights Point weights
 * @param dayQuality Day quality (0-1)
 * @returns Available points per category
 */
export function calculateAvailablePoints(
  weights: PointWeights,
  dayQuality: number
): AvailablePoints {
  const totalAvailable = roundTo1(1000 * dayQuality);
  const distanceAvailable = roundTo1(
    1000 * dayQuality * weights.distanceWeight
  );
  const leadingAvailable = roundTo1(1000 * dayQuality * weights.leadingWeight);
  const arrivalAvailable = roundTo1(1000 * dayQuality * weights.arrivalWeight);
  const departureAvailable = roundTo1(
    1000 * dayQuality * weights.departureWeight
  );
  const timeAvailable =
    totalAvailable -
    distanceAvailable -
    leadingAvailable -
    arrivalAvailable -
    departureAvailable;

  return {
    totalAvailable,
    distanceAvailable,
    timeAvailable,
    arrivalAvailable,
    leadingAvailable,
    departureAvailable,
  };
}

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Calculate linear distance points threshold
 *
 * Linear points are a fixed portion of distance points that all pilots
 * over minimum distance share proportionally.
 *
 * @param availableDistancePoints Total available distance points
 * @param linearFraction Fraction of points that are linear (default 0.3)
 * @returns Linear distance points threshold
 */
export function calculateLinearDistanceThreshold(
  availableDistancePoints: number,
  linearFraction: number = 0.3
): number {
  return availableDistancePoints * linearFraction;
}
