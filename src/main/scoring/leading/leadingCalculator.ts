/**
 * Leading Coefficient Calculator Dispatcher
 *
 * Dispatches to the appropriate LC calculator based on formula configuration.
 * Returns raw integer IV values; callers normalize to LC.
 */

import type { TimeDist } from "../types/flightAnalysis";
import type { ScoringFormulaConfig } from "../types/formula";
import type {
  LeadingCalculatorResult,
  LeadingCalculatorOptions,
} from "./types";
import { calculateClassicLC } from "./classicCalculator";
import {
  calculatePwc2019LC,
  calculatePwc2019Iv,
  calculatePwc2019MissingIv,
} from "./pwc2019Calculator";
import { calculatePwc2023LC, calculatePwc2023Iv } from "./pwc2023Calculator";

/**
 * Calculate raw IV (integral value) for a flight graph.
 *
 * Returns an integer IV that must be normalized to LC via calculateLc().
 *
 * @param graph Time-distance graph from flight analysis
 * @param formula Scoring formula configuration
 * @param speedSectionDistance Speed section distance in meters
 * @returns Integer IV value
 */
export function calculateIv(
  graph: TimeDist[],
  formula: ScoringFormulaConfig,
  speedSectionDistance: number
): number {
  switch (formula.leadingCalculatorType) {
    case "PWC2023":
      return calculatePwc2023Iv(graph, speedSectionDistance);
    case "PWC2019":
      return calculatePwc2019Iv(graph, speedSectionDistance);
    default:
      // Classic: sum of (dist_delta_km * time)
      return calculateClassicIv(graph);
  }
}

/**
 * Calculate missing IV for non-ESS pilots.
 *
 * For PWC2023, this is the same as CalculateIv (per FS implementation).
 * For PWC2019, uses only the falling weight function.
 *
 * @param graph Missing portion graph (typically 2 points)
 * @param formula Scoring formula configuration
 * @param speedSectionDistance Speed section distance in meters
 * @returns Integer missing IV value
 */
export function calculateMissingIv(
  graph: TimeDist[],
  formula: ScoringFormulaConfig,
  speedSectionDistance: number
): number {
  switch (formula.leadingCalculatorType) {
    case "PWC2023":
      // FS results match PWC2019's CalculateMissingIv (uses WeightFalling only)
      // rather than PWC2023's override (which uses the weight matrix CalculateIv).
      // The weight matrix discretization gives very different results for large
      // jumps (like the 2-point missing graph), so use PWC2019 method to match FS.
      return calculatePwc2019MissingIv(graph, speedSectionDistance);
    case "PWC2019":
      // PWC2019 uses only falling weight for missing part
      return calculatePwc2019MissingIv(graph, speedSectionDistance);
    default:
      return calculateClassicIv(graph);
  }
}

/**
 * Classic IV calculation: simple distance * time integral.
 */
function calculateClassicIv(graph: TimeDist[]): number {
  if (!graph || graph.length < 2) return 0;

  let iv = 0;
  for (let i = 1; i < graph.length; i++) {
    const d = (graph[i].dist - graph[i - 1].dist) / 1000;
    iv += d * graph[i].time;
  }
  return Math.round(iv);
}

/**
 * Normalize IV to LC (leading coefficient).
 *
 * Formula: lc = iv / (1800 * (speedSectionDistance / 1000))
 *
 * Based on FS LeadingCalculatorClassic.CalculateLc()
 *
 * @param speedSectionDistance Speed section distance in meters
 * @param iv Integer IV value
 * @returns LC value
 */
export function calculateLc(speedSectionDistance: number, iv: number): number {
  if (iv === 0) return 0;
  return iv / (1800 * (speedSectionDistance / 1000));
}

/**
 * Build the "missing part" time-distance graph for non-ESS pilots.
 *
 * Creates a 2-point graph simulating the pilot completing the speed section
 * at the task end time.
 *
 * Based on FS LeadingCalculatorClassic.GetMissingPartOfTimeDist()
 *
 * @param flownSsDistance Distance pilot flew along SS (meters)
 * @param ssDistance Total speed section distance (meters)
 * @param lastTime Time in seconds from SS open to end of task (max of pilot landing, last finish)
 * @returns 2-point TimeDist graph for missing IV calculation
 */
export function buildMissingGraph(
  flownSsDistance: number,
  ssDistance: number,
  lastTime: number
): TimeDist[] {
  return [
    {
      dist: flownSsDistance,
      dist2es: ssDistance - flownSsDistance,
      time: lastTime,
      alt: 0,
    },
    {
      dist: ssDistance,
      dist2es: 0,
      time: lastTime,
      alt: 0,
    },
  ];
}

/**
 * Calculate leading coefficient using the configured calculator type.
 *
 * NOTE: For PWC2019/PWC2023, totalArea contains the raw integer IV,
 * not the normalized LC. Use calculateLc() to normalize.
 *
 * @param graph Time-distance graph from flight analysis
 * @param formula Scoring formula configuration
 * @param speedSectionDistance Speed section distance in meters
 * @param _essAltitude ESS altitude in meters (unused in current impl)
 * @returns Leading coefficient result
 */
export function calculateLeadingCoeff(
  graph: TimeDist[],
  formula: ScoringFormulaConfig,
  speedSectionDistance: number,
  _essAltitude?: number
): LeadingCalculatorResult {
  const options: LeadingCalculatorOptions = {
    speedSectionDistance,
    essAltitude: _essAltitude,
    altitudeBonusFactor: formula.altitudeBonusFactor,
  };

  switch (formula.leadingCalculatorType) {
    case "PWC2023":
      return calculatePwc2023LC(graph, options);

    case "PWC2019":
      return calculatePwc2019LC(graph, options);

    case "Classic":
    default:
      return calculateClassicLC(graph, options);
  }
}
