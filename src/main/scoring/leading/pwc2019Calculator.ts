/**
 * PWC 2019 Leading Coefficient Calculator
 *
 * Based on FS FsSfGAP/LeadingCalculator/LeadingCalculatorPwc2019.cs
 *
 * Uses weighted distance x time integral with raising and falling weight functions.
 */

import type { TimeDist } from "../types/flightAnalysis";
import type {
  LeadingCalculatorResult,
  LeadingCalculatorOptions,
} from "./types";

/**
 * Raising weight function: penalizes pilots near the start (high ratio = far from ESS)
 */
function weightRaising(leftToDo: number): number {
  return Math.pow(1 - Math.pow(10, 9 * leftToDo - 9), 5);
}

/**
 * Falling weight function: rewards pilots near ESS (low ratio = close to ESS)
 */
function weightFalling(leftToDo: number): number {
  return Math.pow(1 - Math.pow(10, -3 * leftToDo), 2);
}

/**
 * Combined weight function (exported for use by PWC2023 calculator)
 */
export function weightPwc2019(leftToDo: number): number {
  return weightRaising(leftToDo) * weightFalling(leftToDo);
}

/**
 * Calculate IV using PWC 2019 method: weighted distance x time integral.
 *
 * @param graph Time-distance graph
 * @param speedSectionDistance Speed section distance in meters
 * @returns Integer IV value
 */
export function calculatePwc2019Iv(
  graph: TimeDist[],
  speedSectionDistance: number
): number {
  if (!graph || graph.length < 2 || speedSectionDistance <= 0) {
    return 0;
  }

  let iv = 0;

  for (let i = 1; i < graph.length; i++) {
    const w = weightPwc2019(graph[i].dist2es / speedSectionDistance);
    const d = (w * (graph[i].dist - graph[i - 1].dist)) / 1000.0;
    iv += d * graph[i].time;
  }

  return Math.round(iv);
}

/**
 * Calculate missing IV for non-ESS pilots using PWC 2019 method.
 *
 * Uses only the falling weight (not the combined weight).
 *
 * @param graph Missing portion time-distance graph (2 points)
 * @param speedSectionDistance Speed section distance in meters
 * @returns Integer missing IV value
 */
export function calculatePwc2019MissingIv(
  graph: TimeDist[],
  speedSectionDistance: number
): number {
  if (!graph || graph.length < 2 || speedSectionDistance <= 0) {
    return 0;
  }

  let iv = 0;

  for (let i = 1; i < graph.length; i++) {
    const w = weightFalling(graph[i - 1].dist2es / speedSectionDistance);
    iv += (w * (graph[i].dist - graph[i - 1].dist) * graph[i].time) / 1000.0;
  }

  return Math.round(iv);
}

/**
 * Calculate leading coefficient using PWC 2019 method.
 *
 * Returns result with totalArea = raw integer IV (not normalized LC).
 *
 * @param graph Time-distance graph from flight analysis
 * @param options Calculator options
 * @returns Leading coefficient result with IV in totalArea
 */
export function calculatePwc2019LC(
  graph: TimeDist[],
  options: LeadingCalculatorOptions
): LeadingCalculatorResult {
  const iv = calculatePwc2019Iv(graph, options.speedSectionDistance);

  return {
    leadingCoeff: iv,
    areaBeforeBest: 0,
    areaAfterBest: 0,
    totalArea: iv,
  };
}
