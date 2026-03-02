/**
 * Task statistics calculation for scoring
 *
 * Aggregates statistics from all flight analyses needed for scoring calculations.
 * Based on FS GAP.cs statistics collection.
 */

import type { FlightAnalysis } from "../types/flightAnalysis";
import type { TaskDefinition } from "../types/task";
import type { TaskStatistics } from "../types/results";
import type { ScoringFormulaConfig } from "../types/formula";

/**
 * Calculate aggregate statistics for a task from all flight analyses
 *
 * @param task Task definition
 * @param analyses Flight analyses for all participants
 * @param formula Scoring formula configuration
 * @returns Task statistics for scoring calculations
 */
export function calculateTaskStatistics(
  task: TaskDefinition,
  analyses: FlightAnalysis[],
  formula: ScoringFormulaConfig
): TaskStatistics {
  // Filter to valid flights only
  const validFlights = analyses.filter((a) => a.isValid);

  // Minimum distance threshold
  const minDistance = formula.minimumDistance;

  // --- Pilot counts ---
  const pilotsPresent = analyses.length;
  const pilotsFlying = validFlights.length;
  const pilotsLaunched = validFlights.filter((a) => a.takeoffTime).length;
  const pilotsLandedBeforeDeadline = validFlights.length; // TODO: check deadline

  // --- Goal/ESS stats ---
  const pilotsInGoal = validFlights.filter((a) => a.reachedGoal).length;
  const pilotsReachedESS = validFlights.filter((a) => a.essTime).length;

  // --- Distance stats ---
  const distances = validFlights.map((a) => a.distanceFlown);
  const bestDistance = distances.length > 0 ? Math.max(...distances) : 0;

  // Sum of distances over minimum (for distance validity)
  const distancesOverMin = distances.filter((d) => d > minDistance);
  const sumOfFlownDistancesOverMin = distancesOverMin.reduce(
    (sum, d) => sum + (d - minDistance),
    0
  );
  const maxDistanceOverMin = Math.max(0, bestDistance - minDistance);

  // --- Time stats (goal finishers only) ---
  const goalFinishers = validFlights.filter(
    (a) => a.reachedGoal && a.startTime && a.essTime
  );

  // Calculate race times in seconds
  const raceTimes = goalFinishers.map(
    (a) => (a.essTime! - a.startTime!) / 1000
  );
  const bestTime = raceTimes.length > 0 ? Math.min(...raceTimes) : 0;

  // Finish timestamps (ESS crossing times)
  const finishTimes = goalFinishers.map((a) => a.essTime!);
  const bestFinishTime = finishTimes.length > 0 ? Math.min(...finishTimes) : 0;
  const lastFinishTime = finishTimes.length > 0 ? Math.max(...finishTimes) : 0;

  // --- Leading coefficient stats ---
  // Note: LC values are calculated during pilot scoring, but we need
  // the smallest LC for normalization. This is a chicken-and-egg problem.
  // We set placeholder values here; actual LC stats are computed in taskScorer.
  const sumOfLeadingCoeffs = 0;
  const smallestLeadingCoeff = 0;

  return {
    // Pilot counts
    pilotsPresent,
    pilotsFlying,
    pilotsLaunched,
    pilotsLandedBeforeDeadline,

    // Goal stats
    pilotsInGoal,
    pilotsReachedESS,

    // Distance stats
    bestDistance,
    sumOfFlownDistancesOverMin,
    maxDistanceOverMin,
    minDistance,

    // Time stats
    bestTime,
    bestFinishTime,
    lastFinishTime,

    // Leading stats (placeholders, calculated later)
    sumOfLeadingCoeffs,
    smallestLeadingCoeff,
    leadingWeightFactor: formula.leadingWeightFactor,

    // Nominal values from formula
    nominalDistance: formula.nominalDistance,
    nominalTime: formula.nominalTime,
    nominalGoal: formula.nominalGoal,
    nominalLaunch: formula.nominalLaunch,
  };
}

/**
 * Update statistics with calculated leading coefficient values
 *
 * @param stats Original statistics
 * @param lcValues Leading coefficients from all pilots
 * @returns Updated statistics with LC values
 */
export function updateStatsWithLeadingCoeffs(
  stats: TaskStatistics,
  lcValues: number[]
): TaskStatistics {
  const validLcs = lcValues.filter((lc) => lc > 0);

  return {
    ...stats,
    sumOfLeadingCoeffs: validLcs.reduce((sum, lc) => sum + lc, 0),
    smallestLeadingCoeff: validLcs.length > 0 ? Math.min(...validLcs) : 0,
  };
}
