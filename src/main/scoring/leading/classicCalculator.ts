/**
 * Classic Leading Coefficient Calculator
 *
 * Based on FS FsSfGAP/LeadingCalculator/LeadingCalculatorClassic.cs
 *
 * Simple area under the time-distance curve using trapezoidal integration.
 * Rewards pilots who spent time at the front of the race.
 */

import type { TimeDist } from "../types/flightAnalysis";
import type {
  LeadingCalculatorResult,
  LeadingCalculatorOptions,
} from "./types";

/**
 * Calculate leading coefficient using Classic method
 *
 * Classic LC uses simple trapezoidal integration of area under the
 * time-distance curve. The area is calculated as time × remaining distance.
 *
 * @param graph Time-distance graph from flight analysis
 * @param options Calculator options
 * @returns Leading coefficient result
 */
export function calculateClassicLC(
  graph: TimeDist[],
  _options: LeadingCalculatorOptions
): LeadingCalculatorResult {
  if (!graph || graph.length < 2) {
    return {
      leadingCoeff: 0,
      areaBeforeBest: 0,
      areaAfterBest: 0,
      totalArea: 0,
    };
  }

  let totalArea = 0;

  // Calculate area under curve using trapezoidal integration
  for (let i = 1; i < graph.length; i++) {
    const prev = graph[i - 1];
    const curr = graph[i];

    // Time delta in seconds
    const dt = curr.time - prev.time;

    if (dt <= 0) {
      continue;
    }

    // Average distance to ESS (decreasing as pilot progresses)
    const avgDist2es = (prev.dist2es + curr.dist2es) / 2;

    // Area contribution: time × remaining distance
    // Smaller remaining distance = pilot is leading
    totalArea += dt * avgDist2es;
  }

  // Classic method doesn't split before/after best
  return {
    leadingCoeff: totalArea,
    areaBeforeBest: totalArea,
    areaAfterBest: 0,
    totalArea,
  };
}
