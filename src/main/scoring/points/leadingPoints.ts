/**
 * Leading points calculation for GAP scoring
 *
 * Based on FS GAP.cs lines 967-993.
 * Leading points reward pilots who led the race.
 */

import type { FlightAnalysis } from "../types/flightAnalysis";
import type { TaskStatistics, AvailablePoints } from "../types/results";
import type { ScoringFormulaConfig } from "../types/formula";
import type { LeadingCalculatorResult } from "../leading/types";
import { calculateLeadingCoeff } from "../leading/leadingCalculator";

/**
 * Calculate leading points for a pilot
 *
 * Leading points reward pilots who spent time at the front of the race.
 * The leading coefficient (LC) measures this, and points are awarded
 * based on how the pilot's LC compares to the best (smallest) LC.
 *
 * @param analysis Flight analysis for the pilot
 * @param stats Task statistics
 * @param available Available points
 * @param formula Scoring formula configuration
 * @param taskLcMin Minimum LC for normalization
 * @param speedSectionDistance Speed section distance in meters
 * @param essAltitude ESS altitude in meters
 * @returns Leading points
 */
export function calculateLeadingPoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig,
  taskLcMin: number,
  speedSectionDistance: number,
  essAltitude?: number
): number {
  // Check if leading points are enabled
  if (!formula.useLeadingPoints || available.leadingAvailable <= 0) {
    return 0;
  }

  // Must reach ESS to get leading points
  if (!analysis.essTime) {
    return 0;
  }

  // Calculate pilot's leading coefficient
  const lcResult = calculateLeadingCoeff(
    analysis.timeDistanceGraph,
    formula,
    speedSectionDistance,
    essAltitude
  );

  const lc = lcResult.totalArea;

  if (lc <= 0) {
    return 0;
  }

  const smallestLc = stats.smallestLeadingCoeff;

  // If no valid LCs, best LC gets all points
  if (smallestLc <= 0) {
    return available.leadingAvailable;
  }

  // Calculate leading fraction
  const leadingFraction = calcLeadingFraction(lc, smallestLc);

  const points = leadingFraction * available.leadingAvailable;

  return Math.min(points, available.leadingAvailable);
}

/**
 * Calculate leading fraction (GAP.cs lines 967-993)
 *
 * Formula: fraction = 1 - (lcDiff / √smallestLc)^(2/3)
 *
 * @param lc Pilot's leading coefficient
 * @param smallestLc Smallest (best) leading coefficient in task
 * @returns Leading fraction (0-1)
 */
export function calcLeadingFraction(lc: number, smallestLc: number): number {
  if (lc <= 0 || smallestLc <= 0) {
    return 0;
  }

  // LC equal to best gets full points
  if (lc <= smallestLc) {
    return 1;
  }

  const lcDiff = lc - smallestLc;

  // Exponent of 2/3 determines point distribution curve
  const base = lcDiff / Math.sqrt(smallestLc);
  const fraction = 1 - Math.pow(base, 2 / 3);

  return Math.max(0, fraction);
}

/**
 * Calculate leading points with pre-computed LC result
 *
 * Use this when you already have the LC result from a previous calculation.
 *
 * @param lcResult Pre-computed leading coefficient result
 * @param stats Task statistics
 * @param available Available points
 * @param formula Scoring formula configuration
 * @returns Leading points
 */
export function calculateLeadingPointsFromLcResult(
  lcResult: LeadingCalculatorResult,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig
): number {
  // Check if leading points are enabled
  if (!formula.useLeadingPoints || available.leadingAvailable <= 0) {
    return 0;
  }

  const lc = lcResult.totalArea;

  if (lc <= 0) {
    return 0;
  }

  const smallestLc = stats.smallestLeadingCoeff;

  if (smallestLc <= 0) {
    return available.leadingAvailable;
  }

  const leadingFraction = calcLeadingFraction(lc, smallestLc);
  const points = leadingFraction * available.leadingAvailable;

  return Math.min(points, available.leadingAvailable);
}
