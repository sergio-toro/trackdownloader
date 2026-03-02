/**
 * PWC 2023 Leading Coefficient Calculator
 *
 * Based on FS FsSfGAP/LeadingCalculator/LeadingCalculatorPwc2023.cs
 *
 * Most sophisticated version with altitude compensation.
 * Pilots flying higher receive a bonus, recognizing the tactical
 * value of altitude for leading.
 */

import type { TimeDist } from "../types/flightAnalysis";
import type {
  LeadingCalculatorResult,
  LeadingCalculatorOptions,
} from "./types";

/**
 * Calculate leading coefficient using PWC 2023 method
 *
 * PWC 2023 builds on PWC 2019 with altitude bonus:
 * - Base: squared distance weighting like PWC 2019
 * - Bonus: altitude relative to ESS affects weight
 *
 * GAP2023 uses this with altitudeBonusFactor = 0
 * GAP2025 uses this with altitudeBonusFactor = 0.05 (5% per 1000m)
 *
 * @param graph Time-distance graph from flight analysis
 * @param options Calculator options
 * @returns Leading coefficient result
 */
export function calculatePwc2023LC(
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

  const {
    speedSectionDistance,
    essAltitude = 0,
    altitudeBonusFactor = 0,
  } = options;

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

    // Base distance weighting (squared)
    const prevDistWeight = Math.pow(prev.dist2es / speedSectionDistance, 2);
    const currDistWeight = Math.pow(curr.dist2es / speedSectionDistance, 2);

    // Altitude bonus calculation
    // Pilots higher than ESS get a reduction in LC (bonus)
    // Pilots lower than ESS get an increase in LC (penalty)
    const prevAltBonus = calculateAltitudeBonus(
      prev.alt,
      essAltitude,
      altitudeBonusFactor
    );
    const currAltBonus = calculateAltitudeBonus(
      curr.alt,
      essAltitude,
      altitudeBonusFactor
    );

    // Combined weight with altitude adjustment
    // Higher altitude = higher bonus = lower multiplier = lower LC
    const prevWeight = prevDistWeight * (1 - prevAltBonus);
    const currWeight = currDistWeight * (1 - currAltBonus);

    const avgWeight = (prevWeight + currWeight) / 2;
    const contribution = dt * Math.max(0, avgWeight);

    // Split by position relative to best
    // 1.01 factor provides small tolerance
    if (curr.dist2es <= bestDist2es * 1.01) {
      areaBeforeBest += contribution;
    } else {
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

/**
 * Calculate altitude bonus factor
 *
 * Pilots above ESS altitude get a positive bonus (reduces LC).
 * Pilots below ESS altitude get a negative bonus (increases LC).
 *
 * @param altitude Current altitude in meters
 * @param essAltitude ESS altitude in meters
 * @param factor Bonus factor per 1000m (e.g., 0.05 = 5%)
 * @returns Altitude bonus (positive = above ESS, negative = below)
 */
function calculateAltitudeBonus(
  altitude: number,
  essAltitude: number,
  factor: number
): number {
  if (factor <= 0) {
    return 0;
  }

  // Altitude difference from ESS
  const altDiff = altitude - essAltitude;

  // Bonus per 1000m
  return (altDiff / 1000) * factor;
}
