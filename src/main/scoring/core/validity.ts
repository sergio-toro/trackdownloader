/**
 * Day validity calculations for GAP scoring
 *
 * Based on FS GAP.cs lines 187-290.
 * Validity measures the quality of a competition task.
 */

import type { TaskStatistics } from "../types/results";
import type { ScoringFormulaConfig } from "../types/formula";
import type { TaskState } from "../types/competition";

/**
 * Calculate Time Validity (GAP.cs lines 187-208)
 *
 * Measures the quality of racing based on best time or distance achieved.
 * Uses polynomial transformation for smooth curve.
 *
 * Formula: TV = -0.271 + 2.912x - 2.098x² + 0.457x³
 * where x = min(bestTime/nomTime, 1) or min(bestDist/nomDist, 1)
 *
 * @param stats Task statistics
 * @param formula Scoring formula configuration
 * @returns Time validity (0-1)
 */
export function calcTimeValidity(
  stats: TaskStatistics,
  _formula: ScoringFormulaConfig
): number {
  const { bestTime, nominalTime, bestDistance, nominalDistance } = stats;

  let tvRaw: number;

  if (bestTime > 0) {
    // Best time achieved - use time ratio
    tvRaw = Math.min(bestTime / nominalTime, 1);
  } else {
    // No finisher - use distance ratio
    tvRaw = Math.min(bestDistance / nominalDistance, 1);
  }

  // Polynomial transformation (empirical formula from GAP spec)
  const tv =
    -0.271 +
    2.912 * tvRaw -
    2.098 * Math.pow(tvRaw, 2) +
    0.457 * Math.pow(tvRaw, 3);

  return clamp(tv, 0, 1);
}

/**
 * Calculate Launch Validity (GAP.cs lines 210-218)
 *
 * Penalizes when fewer pilots launch than expected.
 * Ensures tasks where many pilots don't launch are scored appropriately.
 *
 * Formula: LV = 0.028x + 2.917x² - 1.944x³
 * where x = min(pilotsFlying / (pilotsPresent × nomLaunch), 1)
 *
 * @param stats Task statistics
 * @param formula Scoring formula configuration
 * @returns Launch validity (0-1)
 */
export function calcLaunchValidity(
  stats: TaskStatistics,
  _formula: ScoringFormulaConfig
): number {
  const { pilotsFlying, pilotsPresent, nominalLaunch } = stats;

  if (pilotsPresent === 0) {
    return 0;
  }

  const expectedLaunchers = pilotsPresent * nominalLaunch;
  const lvRaw = Math.min(1.0, pilotsFlying / expectedLaunchers);

  // Polynomial transformation
  const lv =
    0.028 * lvRaw + 2.917 * Math.pow(lvRaw, 2) - 1.944 * Math.pow(lvRaw, 3);

  return clamp(lv, 0, 1);
}

/**
 * Calculate Distance Validity (GAP.cs lines 220-255)
 *
 * Measures how spread out pilots are in terms of distance flown.
 * A higher spread indicates a more valid task.
 *
 * Formula: DV = avgDistOverMin / nomDistOverMin
 *
 * @param stats Task statistics
 * @param formula Scoring formula configuration
 * @returns Distance validity (0-1)
 */
export function calcDistanceValidity(
  stats: TaskStatistics,
  _formula: ScoringFormulaConfig
): number {
  const {
    pilotsFlying,
    sumOfFlownDistancesOverMin,
    maxDistanceOverMin,
    nominalDistance,
    minDistance,
  } = stats;

  if (pilotsFlying === 0 || maxDistanceOverMin <= 0) {
    return 0;
  }

  // Nominal distance minus minimum
  const nomDistOverMin = Math.max(0, nominalDistance - minDistance);

  if (nomDistOverMin <= 0) {
    return 1;
  }

  // Average distance over minimum
  const avgDistOverMin = sumOfFlownDistancesOverMin / pilotsFlying;

  // Distance validity formula
  const dv = avgDistOverMin / nomDistOverMin;

  return clamp(dv, 0, 1);
}

/**
 * Calculate Stop Validity (GAP.cs lines 257-280)
 *
 * Only applies to stopped tasks. Penalizes tasks that were stopped
 * before pilots could complete them.
 *
 * @param stats Task statistics
 * @param formula Scoring formula configuration
 * @param taskState Current task state
 * @returns Stop validity (0-1)
 */
export function calcStopValidity(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig,
  taskState: TaskState
): number {
  // No penalty for regular (non-stopped) tasks
  if (taskState !== "Stopped") {
    return 1.0;
  }

  const { pilotsInGoal, pilotsFlying, bestDistance } = stats;
  const taskDistance = formula.nominalDistance;

  if (pilotsFlying === 0) {
    return 0;
  }

  // Pilots reached goal factor
  const goalFactor = pilotsInGoal / pilotsFlying;

  // Distance factor
  const distFactor = taskDistance > 0 ? bestDistance / taskDistance : 0;

  // Combined stop validity - take the better of the two
  const sv = Math.max(goalFactor, distFactor);

  return clamp(sv, 0, 1);
}

/**
 * Calculate Day Quality (GAP.cs lines 282-290)
 *
 * Combined validity measure - product of all validity factors.
 * Maximum points available = 1000 × dayQuality
 *
 * @param timeValidity Time validity (0-1)
 * @param launchValidity Launch validity (0-1)
 * @param distanceValidity Distance validity (0-1)
 * @param stopValidity Stop validity (0-1)
 * @returns Day quality (0-1)
 */
export function calcDayQuality(
  timeValidity: number,
  launchValidity: number,
  distanceValidity: number,
  stopValidity: number
): number {
  return timeValidity * launchValidity * distanceValidity * stopValidity;
}

/**
 * Calculate all validity scores at once
 *
 * @param stats Task statistics
 * @param formula Scoring formula configuration
 * @param taskState Current task state
 * @returns Object with all validity scores and day quality
 */
export function calculateAllValidities(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig,
  taskState: TaskState
): {
  timeValidity: number;
  launchValidity: number;
  distanceValidity: number;
  stopValidity: number;
  dayQuality: number;
} {
  const timeValidity = calcTimeValidity(stats, formula);
  const launchValidity = calcLaunchValidity(stats, formula);
  const distanceValidity = calcDistanceValidity(stats, formula);
  const stopValidity = calcStopValidity(stats, formula, taskState);
  const dayQuality = calcDayQuality(
    timeValidity,
    launchValidity,
    distanceValidity,
    stopValidity
  );

  return {
    timeValidity,
    launchValidity,
    distanceValidity,
    stopValidity,
    dayQuality,
  };
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
