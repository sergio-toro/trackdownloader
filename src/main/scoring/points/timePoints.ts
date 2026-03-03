/**
 * Time points calculation for GAP scoring
 *
 * Based on FS GAP.cs lines 600-680 and 1159-1173.
 * Time points reward pilots who finish the task faster.
 */

import type { FlightAnalysis } from "../types/flightAnalysis";
import type { TaskStatistics, AvailablePoints } from "../types/results";
import type { ScoringFormulaConfig } from "../types/formula";

/**
 * Calculate time points for a pilot
 *
 * Only pilots who reach goal get time points.
 * Points are calculated based on how close their time is to the best time.
 *
 * @param analysis Flight analysis for the pilot
 * @param stats Task statistics
 * @param available Available points
 * @param formula Scoring formula configuration
 * @returns Time points
 */
export function calculateTimePoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig
): number {
  // Only goal finishers get time points
  if (!analysis.reachedGoal || !analysis.startTime || !analysis.essTime) {
    // Check if formula allows partial time points for non-goal pilots
    if (formula.timePointsIfNotInGoal > 0 && analysis.essTime) {
      // Reached ESS but not goal - may get partial time points
      return calculateEssTimePoints(analysis, stats, available, formula);
    }
    return 0;
  }

  // Calculate pilot's race time in seconds
  const pilotTime = (analysis.essTime - analysis.startTime) / 1000;
  const bestTime = stats.bestTime;

  if (bestTime <= 0 || pilotTime <= 0) {
    return 0;
  }

  // Calculate time fraction
  const timeFraction = calcTimeFraction(
    pilotTime,
    bestTime,
    formula.useFlatDecline
  );

  return timeFraction * available.timeAvailable;
}

/**
 * Calculate time fraction (GAP.cs lines 1159-1173)
 *
 * Formula: fraction = 1 - (timeDiff / √bestTime)^exponent
 *
 * @param time Pilot's race time in seconds
 * @param bestTime Best race time in seconds
 * @param useFlatDecline true = 5/6 exponent, false = 2/3 exponent
 * @returns Time fraction (0-1)
 */
export function calcTimeFraction(
  time: number,
  bestTime: number,
  useFlatDecline: boolean
): number {
  if (time <= 0 || bestTime <= 0) {
    return 0;
  }

  const timeDiff = time - bestTime;

  // Faster than best (shouldn't happen, but handle gracefully)
  if (timeDiff < 0) {
    return 1;
  }

  // Equal to best time
  if (timeDiff === 0) {
    return 1;
  }

  // Exponent determines how steeply points decline with time
  // 5/6 (0.833) = flatter decline (GAP2020+)
  // 2/3 (0.667) = steeper decline (older formulas)
  const exponent = useFlatDecline ? 5 / 6 : 2 / 3;

  // Calculate time fraction (CIVL-GAP spec: divide by 60*sqrt(bestTime))
  const base = timeDiff / (60 * Math.sqrt(bestTime));
  const fraction = 1 - Math.pow(base, exponent);

  return Math.max(0, fraction);
}

/**
 * Calculate partial time points for pilots who reached ESS but not goal
 *
 * @param analysis Flight analysis for the pilot
 * @param stats Task statistics
 * @param available Available points
 * @param formula Scoring formula configuration
 * @returns Partial time points
 */
function calculateEssTimePoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig
): number {
  if (!analysis.startTime || !analysis.essTime) {
    return 0;
  }

  // Calculate what time points would be if they had made goal
  const pilotTime = (analysis.essTime - analysis.startTime) / 1000;
  const bestTime = stats.bestTime;

  if (bestTime <= 0 || pilotTime <= 0) {
    return 0;
  }

  const timeFraction = calcTimeFraction(
    pilotTime,
    bestTime,
    formula.useFlatDecline
  );
  const fullTimePoints = timeFraction * available.timeAvailable;

  // Apply partial factor
  return fullTimePoints * formula.timePointsIfNotInGoal;
}
