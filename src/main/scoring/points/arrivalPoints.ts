/**
 * Arrival points calculation for GAP scoring
 *
 * Based on FS GAP.cs lines 700-780.
 * Arrival points reward pilots for finishing earlier in wall-clock time.
 *
 * Note: GAP2023 and GAP2025 typically have arrival points disabled.
 */

import type { FlightAnalysis } from "../types/flightAnalysis";
import type { TaskStatistics, AvailablePoints } from "../types/results";
import type { ScoringFormulaConfig } from "../types/formula";

/**
 * Calculate arrival points for a pilot
 *
 * Rewards pilots for finishing earlier (first to cross goal line).
 * Different from time points which reward faster race times.
 *
 * @param analysis Flight analysis for the pilot
 * @param stats Task statistics
 * @param available Available points
 * @param formula Scoring formula configuration
 * @param allAnalyses All pilot analyses (for position calculation)
 * @returns Arrival points
 */
export function calculateArrivalPoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig,
  allAnalyses: FlightAnalysis[]
): number {
  // Check if arrival points are enabled
  if (!formula.useArrivalPoints || available.arrivalAvailable <= 0) {
    return 0;
  }

  // Must reach goal to get arrival points
  if (!analysis.reachedGoal || !analysis.essTime) {
    return 0;
  }

  // Get finish position (1-based)
  const position = getFinishPosition(analysis, allAnalyses);
  const totalFinishers = stats.pilotsInGoal;

  // First place gets all available points
  if (totalFinishers <= 1) {
    return available.arrivalAvailable;
  }

  // Calculate arrival fraction based on position
  const arrivalFraction = calcArrivalFraction(position, totalFinishers);

  return arrivalFraction * available.arrivalAvailable;
}

/**
 * Get finish position for a pilot (1-based)
 *
 * @param analysis Pilot's flight analysis
 * @param allAnalyses All pilot analyses
 * @returns Finish position (1 = first)
 */
export function getFinishPosition(
  analysis: FlightAnalysis,
  allAnalyses: FlightAnalysis[]
): number {
  // Get all goal finishers sorted by ESS time
  const finishers = allAnalyses
    .filter((a) => a.reachedGoal && a.essTime)
    .map((a) => ({
      pilotId: a.pilotId,
      time: a.essTime!,
    }))
    .sort((a, b) => a.time - b.time);

  // Find position of this pilot
  const position = finishers.findIndex((f) => f.pilotId === analysis.pilotId);

  // Convert to 1-based position
  return position >= 0 ? position + 1 : finishers.length + 1;
}

/**
 * Calculate arrival fraction based on finish position
 *
 * Uses a curve to distribute points:
 * - First place: 1.0
 * - Last place: approaches 0
 *
 * @param position Finish position (1-based)
 * @param total Total number of finishers
 * @returns Arrival fraction (0-1)
 */
export function calcArrivalFraction(position: number, total: number): number {
  if (total <= 0 || position <= 0) {
    return 0;
  }

  if (position === 1) {
    return 1;
  }

  // Position ratio: 1 for first, decreasing to 1/n for last
  const positionRatio = (total - position + 1) / total;

  // Apply curve to spread out points
  // Exponent of 0.667 (2/3) gives moderate spread
  return Math.pow(positionRatio, 0.667);
}
