/**
 * Distance points calculation for GAP scoring
 *
 * Based on FS GAP.cs lines 500-580.
 * Distance points reward pilots based on how far they flew.
 */

import type { FlightAnalysis } from "../types/flightAnalysis";
import type { TaskStatistics, AvailablePoints } from "../types/results";
import type { ScoringFormulaConfig } from "../types/formula";

/**
 * Calculate distance points for a pilot
 *
 * Distance points have two components:
 * 1. Linear points (30%): Proportional to distance over minimum
 * 2. Difficulty points (70%): Exponential curve rewarding longer flights
 *
 * @param analysis Flight analysis for the pilot
 * @param stats Task statistics
 * @param available Available points
 * @param formula Scoring formula configuration
 * @returns Distance points
 */
export function calculateDistancePoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig
): number {
  const { distanceFlown } = analysis;
  const { bestDistance, minDistance } = stats;

  // Pilots below minimum distance get 0 points
  if (distanceFlown <= minDistance) {
    return 0;
  }

  // Distance over minimum
  const distOverMin = distanceFlown - minDistance;
  const bestOverMin = bestDistance - minDistance;

  if (bestOverMin <= 0) {
    return 0;
  }

  // Linear distance ratio (0-1)
  const distanceRatio = distOverMin / bestOverMin;

  // Split available points into linear and difficulty portions
  const linearFraction = 0.3; // 30% linear
  const linearAvailable = available.distanceAvailable * linearFraction;
  const difficultyAvailable =
    available.distanceAvailable * (1 - linearFraction);

  // Linear portion: proportional to distance ratio
  const linearPoints = distanceRatio * linearAvailable;

  // Difficulty portion: exponential curve (ratio^1.5)
  // This rewards pilots who fly further more heavily
  let difficultyPoints = 0;
  if (formula.useDifficultyForDistancePoints) {
    const difficultyFactor = Math.pow(distanceRatio, 1.5);
    difficultyPoints = difficultyFactor * difficultyAvailable;
  } else {
    // Without difficulty, all remaining points are also linear
    difficultyPoints = distanceRatio * difficultyAvailable;
  }

  return linearPoints + difficultyPoints;
}

/**
 * Calculate difficulty coefficient for a specific distance
 *
 * The difficulty coefficient measures how hard it was to reach
 * a particular distance based on where other pilots landed.
 *
 * @param distance Distance flown
 * @param landingDistances Array of all pilot landing distances
 * @param minDistance Minimum distance threshold
 * @returns Difficulty coefficient (0-1)
 */
export function calculateDifficultyCoefficient(
  distance: number,
  landingDistances: number[],
  minDistance: number
): number {
  // Count pilots who landed before this distance
  const pilotsLandedBefore = landingDistances.filter(
    (d) => d < distance && d > minDistance
  ).length;

  const totalValidPilots = landingDistances.filter(
    (d) => d > minDistance
  ).length;

  if (totalValidPilots === 0) {
    return 0;
  }

  // Higher ratio = more pilots landed before = harder to reach
  return pilotsLandedBefore / totalValidPilots;
}
