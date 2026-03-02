/**
 * PWC 2019 Leading Coefficient Calculator
 *
 * Based on FS FsSfGAP/LeadingCalculator/LeadingCalculatorPwc2019.cs
 *
 * Introduces squared distance weighting to reward pilots who are
 * further ahead more heavily than those just barely leading.
 */

import type { TimeDist } from "../types/flightAnalysis";
import type {
  LeadingCalculatorResult,
  LeadingCalculatorOptions,
} from "./types";

/**
 * Calculate leading coefficient using PWC 2019 method
 *
 * PWC 2019 uses squared distance weighting:
 * - Weight = (dist2es / ssDistance)²
 * - Lower distance to ESS = lower weight = better LC
 *
 * Also splits area into before/after best position reached.
 *
 * @param graph Time-distance graph from flight analysis
 * @param options Calculator options
 * @returns Leading coefficient result
 */
export function calculatePwc2019LC(
  graph: TimeDist[],
  options: LeadingCalculatorOptions
): LeadingCalculatorResult {
  if (!graph || graph.length < 2) {
    return {
      leadingCoeff: 0,
      areaBeforeBest: 0,
      areaAfterBest: 0,
      totalArea: 0,
    };
  }

  const { speedSectionDistance } = options;

  if (speedSectionDistance <= 0) {
    return {
      leadingCoeff: 0,
      areaBeforeBest: 0,
      areaAfterBest: 0,
      totalArea: 0,
    };
  }

  // Find best (minimum) distance to ESS achieved
  const bestDist2es = Math.min(...graph.map((p) => p.dist2es));

  let areaBeforeBest = 0;
  let areaAfterBest = 0;

  for (let i = 1; i < graph.length; i++) {
    const prev = graph[i - 1];
    const curr = graph[i];

    // Time delta in seconds
    const dt = curr.time - prev.time;

    if (dt <= 0) {
      continue;
    }

    // Squared distance weighting
    // Lower dist2es = lower weight = better (smaller LC)
    const prevWeight = Math.pow(prev.dist2es / speedSectionDistance, 2);
    const currWeight = Math.pow(curr.dist2es / speedSectionDistance, 2);
    const avgWeight = (prevWeight + currWeight) / 2;

    const contribution = dt * avgWeight;

    // Split into before/after best position
    // 1.01 factor provides small tolerance
    if (curr.dist2es <= bestDist2es * 1.01) {
      // Still progressing towards best position
      areaBeforeBest += contribution;
    } else {
      // Past best position (backtracking or going backwards)
      areaAfterBest += contribution;
    }
  }

  const totalArea = areaBeforeBest + areaAfterBest;

  return {
    leadingCoeff: totalArea,
    areaBeforeBest,
    areaAfterBest,
    totalArea,
  };
}
