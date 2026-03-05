/**
 * Point weight distribution for GAP scoring
 *
 * Based on FS GAP.cs lines 300-450.
 * Calculates how the available points are distributed across categories.
 */

import type {
  TaskStatistics,
  PointWeights,
  AvailablePoints,
} from "../types/results";
import type { TaskDefinition } from "../types/task";
import type { ScoringFormulaConfig } from "../types/formula";

/**
 * Calculate base point weight distribution (GAP.cs lines 300-380)
 *
 * Points are distributed based on how many pilots reached goal.
 * More goal finishers = more time points, fewer = more distance points.
 *
 * @param stats Task statistics
 * @param formula Scoring formula configuration
 * @returns Point weights (sum to 1)
 */
export function calculateWeights(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig
): PointWeights {
  const { pilotsFlying, pilotsInGoal } = stats;

  // Goal ratio determines base weight split
  const goalRatio = pilotsFlying > 0 ? pilotsInGoal / pilotsFlying : 0;

  // Distance weight: CIVL-GAP cubic polynomial
  // Higher when fewer pilots reach goal
  const gr = goalRatio;
  const distanceWeight =
    0.9 - 1.665 * gr + 1.713 * gr * gr - 0.587 * gr * gr * gr;

  // Speed weight is the complement, then split into time/leading/etc
  let timeWeight = 1 - distanceWeight;

  // Arrival weight (optional, usually 0 in GAP2023+)
  let arrivalWeight = 0;
  if (formula.useArrivalPoints && goalRatio > 0) {
    arrivalWeight = goalRatio * formula.arrivalFraction;
    timeWeight -= arrivalWeight;
  }

  // Leading weight (from time portion)
  let leadingWeight = 0;
  if (formula.useLeadingPoints && timeWeight > 0) {
    leadingWeight = timeWeight * formula.leadingFraction;
    timeWeight -= leadingWeight;
  }

  // Departure weight (usually 0 in modern formulas)
  let departureWeight = 0;
  if (formula.useDeparturePoints && timeWeight > 0) {
    departureWeight = timeWeight * formula.departureFraction;
    timeWeight -= departureWeight;
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
 * Apply GAP2023 specific weight adjustments
 *
 * GAP2023 uses a fixed leading weight factor.
 *
 * @param weights Base weights
 * @param stats Task statistics
 * @param formula Scoring formula configuration
 * @returns Adjusted weights
 */
export function applyGap2023Adjustments(
  weights: PointWeights,
  stats: TaskStatistics,
  formula: ScoringFormulaConfig
): PointWeights {
  const adjusted = { ...weights };

  // GAP2023 applies leadingWeightFactor to leading weight
  if (
    formula.leadingWeightFactor !== undefined &&
    formula.leadingWeightFactor !== 1.0
  ) {
    const factor = formula.leadingWeightFactor;
    const originalLeading = adjusted.leadingWeight;
    adjusted.leadingWeight = originalLeading * factor;

    // Take the difference from time weight
    const difference = adjusted.leadingWeight - originalLeading;
    adjusted.timeWeight = Math.max(0, adjusted.timeWeight - difference);
  }

  return adjusted;
}

/**
 * Apply GAP2025 specific weight adjustments
 *
 * GAP2025 introduces dynamic leading weight based on speed section ratio.
 * Longer speed sections = more leading weight.
 *
 * @param weights Base weights
 * @param stats Task statistics
 * @param formula Scoring formula configuration
 * @param task Task definition (for speed section distance)
 * @returns Adjusted weights
 */
export function applyGap2025Adjustments(
  weights: PointWeights,
  stats: TaskStatistics,
  formula: ScoringFormulaConfig,
  task: TaskDefinition
): PointWeights {
  const adjusted = { ...weights };

  // Calculate dynamic factor based on speed section ratio
  // Range: 0.8 (short SS) to 1.2 (long SS)
  const ssRatio = task.speedSectionDistance / task.taskDistance;
  const dynamicFactor = 0.8 + 0.4 * ssRatio;

  const originalLeading = adjusted.leadingWeight;
  adjusted.leadingWeight = originalLeading * dynamicFactor;

  // Take the difference from time weight
  const difference = adjusted.leadingWeight - originalLeading;
  adjusted.timeWeight = Math.max(0, adjusted.timeWeight - difference);

  return adjusted;
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
