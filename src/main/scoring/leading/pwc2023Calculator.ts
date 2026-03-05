/**
 * PWC 2023 Leading Coefficient Calculator
 *
 * Based on FS FsSfGAP/LeadingCalculator/LeadingCalculatorPwc2023.cs
 *
 * Uses a cumulative weight matrix for efficient integral calculation.
 * Inherits Weight() function from PWC2019.
 */

import type { TimeDist } from "../types/flightAnalysis";
import type {
  LeadingCalculatorResult,
  LeadingCalculatorOptions,
} from "./types";
import { weightPwc2019 } from "./pwc2019Calculator";

const LC_WEIGHT_MATRIX_PRECISION = 4;
const SLICES = Math.pow(10, LC_WEIGHT_MATRIX_PRECISION); // 10000

// Pre-compute weight list (singleton)
let _weightList: number[] | null = null;

function getWeightList(): number[] {
  if (_weightList) return _weightList;

  // Build cumulative weight list
  // Start with [0], then accumulate Weight(ratio) for ratio from 1→0
  const list: number[] = [0];

  for (let i = SLICES; i >= 0; i--) {
    const ratio = i / SLICES;
    list.push(list[SLICES - i] + weightPwc2019(ratio));
  }

  // Remove last element and reverse (matching FS behavior)
  list.pop();
  list.reverse();

  _weightList = list;
  return list;
}

/**
 * Calculate IV (integral value) using PWC 2023 cumulative weight matrix method.
 *
 * This is the raw integer IV before LC normalization.
 *
 * @param graph Time-distance graph
 * @param speedSectionDistance Speed section distance in meters
 * @returns Integer IV value
 */
export function calculatePwc2023Iv(
  graph: TimeDist[],
  speedSectionDistance: number
): number {
  if (!graph || graph.length < 2 || speedSectionDistance <= 0) {
    return 0;
  }

  const weightList = getWeightList();
  const slices = weightList.length;
  const sliceDist = speedSectionDistance / 1000 / slices;

  let iv = 0;
  const precision = LC_WEIGHT_MATRIX_PRECISION;

  let ratio = parseFloat(
    (graph[0].dist2es / speedSectionDistance).toFixed(precision)
  );
  let previousIndex = Math.min(slices - 1, Math.floor(ratio * slices));

  for (let i = 1; i < graph.length; i++) {
    ratio = parseFloat(
      (graph[i].dist2es / speedSectionDistance).toFixed(precision)
    );
    const index = Math.floor(ratio * slices);

    if (index >= previousIndex) {
      continue;
    }

    const d = (weightList[index] - weightList[previousIndex]) * sliceDist;
    iv += d * graph[i].time;
    previousIndex = index;
  }

  return Math.round(iv);
}

/**
 * Calculate leading coefficient using PWC 2023 method.
 *
 * Returns result with totalArea = raw integer IV (not normalized LC).
 * Normalization to LC happens in the caller.
 *
 * @param graph Time-distance graph from flight analysis
 * @param options Calculator options
 * @returns Leading coefficient result with IV in totalArea
 */
export function calculatePwc2023LC(
  graph: TimeDist[],
  options: LeadingCalculatorOptions
): LeadingCalculatorResult {
  const iv = calculatePwc2023Iv(graph, options.speedSectionDistance);

  return {
    leadingCoeff: iv,
    areaBeforeBest: 0,
    areaAfterBest: 0,
    totalArea: iv,
  };
}
