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
 * For PG (GAP2023): Simple linear formula
 *   DistancePoints = (distance / bestDistance) × AvailableDistancePoints
 *
 * No minDistance subtraction, no difficulty exponent.
 * Pilots at minimum distance still get proportional points.
 *
 * @param analysis Flight analysis for the pilot
 * @param stats Task statistics
 * @param available Available points
 * @param _formula Scoring formula configuration
 * @returns Distance points
 */
export function calculateDistancePoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  _formula: ScoringFormulaConfig
): number {
  const { distanceFlown } = analysis;
  const { bestDistance } = stats;

  if (bestDistance <= 0) return 0;

  const distanceRatio = distanceFlown / bestDistance;
  return distanceRatio * available.distanceAvailable;
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
