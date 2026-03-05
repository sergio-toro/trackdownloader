/**
 * Task Scorer Orchestrator
 *
 * Main scoring engine that orchestrates all scoring calculations.
 * Takes task definition and flight analyses, produces scored results.
 */

import type { FlightAnalysis } from "../types/flightAnalysis";
import type { TaskDefinition } from "../types/task";
import type {
  TaskResult,
  PilotResult,
  TaskStatistics,
  AvailablePoints,
} from "../types/results";
import type { ScoringFormulaConfig } from "../types/formula";
import type { Penalty } from "../types/participant";
import type { TaskState } from "../types/competition";

import {
  calculateTaskStatistics,
  updateStatsWithLeadingCoeffs,
} from "../core/taskStatistics";
import { calculateAllValidities } from "../core/validity";
import {
  calculateWeights,
  applyGap2023Adjustments,
  applyGap2025Adjustments,
  calculateAvailablePoints,
} from "../core/weights";
import { calculateLeadingCoeff } from "../leading/leadingCalculator";
import { calculateDistancePoints } from "../points/distancePoints";
import { calculateTimePoints } from "../points/timePoints";
import { calculateArrivalPoints } from "../points/arrivalPoints";
import { calculateLeadingPointsFromLcResult } from "../points/leadingPoints";

/**
 * Scoring options for scoreTask
 */
export interface ScoringOptions {
  /** Task definition */
  task: TaskDefinition;

  /** Flight analyses for all participants */
  analyses: FlightAnalysis[];

  /** Scoring formula configuration */
  formula: ScoringFormulaConfig;

  /** Optional penalties per pilot (keyed by pilotId) */
  penalties?: Map<number, Penalty[]>;

  /** Progress callback */
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Score a task
 *
 * Main entry point for scoring. Orchestrates all calculations:
 * 1. Calculate task statistics
 * 2. Calculate validities and day quality
 * 3. Calculate weight distribution
 * 4. Calculate leading coefficients
 * 5. Score each pilot
 * 6. Assign rankings
 *
 * @param options Scoring options
 * @returns Task result with all pilot scores
 */
export async function scoreTask(options: ScoringOptions): Promise<TaskResult> {
  const { task, analyses, formula, penalties, onProgress } = options;

  const taskState: TaskState = task.state || "Regular";

  onProgress?.(5, "Calculating task statistics...");

  // Step 1: Calculate initial statistics
  let stats = calculateTaskStatistics(task, analyses, formula);

  onProgress?.(10, "Calculating validity scores...");

  // Step 2: Calculate validities
  const validities = calculateAllValidities(stats, formula, taskState);
  const {
    timeValidity,
    launchValidity,
    distanceValidity,
    stopValidity,
    dayQuality,
  } = validities;

  onProgress?.(20, "Calculating weight distribution...");

  // Step 3: Calculate weights (with formula-specific adjustments)
  let weights = calculateWeights(stats, formula);

  if (formula.name === "GAP2025") {
    weights = applyGap2025Adjustments(weights, stats, formula, task);
  } else {
    weights = applyGap2023Adjustments(weights, stats, formula);
  }

  // Step 4: Calculate available points
  const available = calculateAvailablePoints(weights, dayQuality);

  onProgress?.(25, "Calculating leading coefficients...");

  // Step 5: Calculate leading coefficients for all pilots who crossed SS
  // FS awards leading points to ANY pilot who started the speed section,
  // not just those who reached ESS.
  const lcResults = new Map<number, ReturnType<typeof calculateLeadingCoeff>>();
  const essAltitude = task.turnpoints[task.esIndex - 1]?.altitude;

  // When useLeadingTimeRatio is enabled (GAP2023), non-ESS pilots' LCs are
  // extended by appending their last position to the task end time. This
  // penalizes pilots who land out by accumulating additional LC area at their
  // last dist2es (which is far from ESS). The task end time is the last ESS
  // crossing + score-back time. For pilots who are STILL flying after that time,
  // this has no effect (their raw graph already covers the full window).
  const lastEssTime = stats.lastFinishTime;
  const scoreBackTime = formula.scoreBackTime || 0;

  for (const analysis of analyses) {
    if (analysis.startTime && analysis.timeDistanceGraph.length >= 2) {
      let graph = analysis.timeDistanceGraph;

      // For non-ESS pilots: extend graph to task end time
      // This ensures pilots who land early are penalized with additional
      // LC area at their last (high) dist2es position
      if (!analysis.essTime && formula.useLeadingTimeRatio && lastEssTime > 0) {
        const lcEndTime =
          (lastEssTime + scoreBackTime * 1000 - analysis.startTime) / 1000;
        const lastPoint = graph[graph.length - 1];
        if (lcEndTime > lastPoint.time) {
          graph = [
            ...graph,
            {
              time: lcEndTime,
              dist: lastPoint.dist,
              dist2es: lastPoint.dist2es,
              alt: lastPoint.alt,
            },
          ];
        }
      }

      const lcResult = calculateLeadingCoeff(
        graph,
        formula,
        task.speedSectionDistance,
        essAltitude
      );

      lcResults.set(analysis.pilotId, lcResult);
    }
  }

  // Calculate LC min from ESS pilots for stable normalization
  const essLcValues = analyses
    .filter((a) => a.essTime)
    .map((a) => lcResults.get(a.pilotId))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => r.totalArea);
  stats = updateStatsWithLeadingCoeffs(stats, essLcValues);

  onProgress?.(30, "Scoring pilots...");

  // Step 6: Score each pilot
  const pilotResults: PilotResult[] = [];
  const total = analyses.length;

  for (let i = 0; i < total; i++) {
    const analysis = analyses[i];
    const percent = 30 + Math.round((i / total) * 60);
    onProgress?.(percent, `Scoring pilot ${i + 1} of ${total}...`);

    const pilotPenalties = penalties?.get(analysis.pilotId) || [];
    const lcResult = lcResults.get(analysis.pilotId);

    const result = scorePilot(
      analysis,
      stats,
      available,
      formula,
      analyses,
      pilotPenalties,
      lcResult
    );

    pilotResults.push(result);
  }

  onProgress?.(90, "Calculating rankings...");

  // Step 7: Sort and assign rankings
  pilotResults.sort((a, b) => b.totalPoints - a.totalPoints);

  let rank = 1;
  for (let i = 0; i < pilotResults.length; i++) {
    if (
      i > 0 &&
      pilotResults[i].totalPoints < pilotResults[i - 1].totalPoints
    ) {
      rank = i + 1;
    }
    pilotResults[i].rank = rank;
  }

  onProgress?.(100, "Scoring complete");

  // Step 8: Build and return result
  return {
    taskId: task.id,
    taskName: task.name,
    taskDate: task.date,
    scoredAt: new Date().toISOString(),
    formula: formula.name,

    // Validity scores
    timeValidity,
    launchValidity,
    distanceValidity,
    stopValidity,
    dayQuality,

    // Available points
    availablePoints: available,

    // Statistics
    statistics: stats,

    // Results
    pilotResults,
  };
}

/**
 * Score an individual pilot
 *
 * @param analysis Flight analysis for the pilot
 * @param stats Task statistics
 * @param available Available points
 * @param formula Scoring formula configuration
 * @param allAnalyses All pilot analyses (for position calculation)
 * @param penalties Penalties for this pilot
 * @param lcResult Pre-computed leading coefficient result
 * @returns Pilot result
 */
function scorePilot(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig,
  allAnalyses: FlightAnalysis[],
  penalties: Penalty[],
  lcResult?: ReturnType<typeof calculateLeadingCoeff>
): PilotResult {
  // Calculate each point category
  const distancePoints = calculateDistancePoints(
    analysis,
    stats,
    available,
    formula
  );
  const timePoints = calculateTimePoints(analysis, stats, available, formula);
  const arrivalPoints = calculateArrivalPoints(
    analysis,
    stats,
    available,
    formula,
    allAnalyses
  );

  // Leading points from pre-computed LC result
  let leadingPoints = 0;
  let leadingCoefficient: number | undefined;

  if (lcResult) {
    leadingCoefficient = lcResult.totalArea;
    leadingPoints = calculateLeadingPointsFromLcResult(
      lcResult,
      stats,
      available,
      formula
    );
  }

  // Sum points
  let totalPoints = distancePoints + timePoints + arrivalPoints + leadingPoints;

  // Apply penalties
  const penaltyPoints = penalties.reduce((sum, p) => sum + (p.points || 0), 0);
  totalPoints = Math.max(0, totalPoints - penaltyPoints);

  // Round to formula precision
  const decimals = formula.numberOfDecimalsTaskResults;
  totalPoints = roundTo(totalPoints, decimals);

  return {
    pilotId: analysis.pilotId,
    rank: 0, // Set later after sorting

    // Flight data
    distance: analysis.distanceFlown,
    time:
      analysis.startTime && analysis.essTime
        ? (analysis.essTime - analysis.startTime) / 1000
        : null,
    reachedGoal: analysis.reachedGoal,
    reachedESS: !!analysis.essTime,

    // Point breakdown
    distancePoints: roundTo(distancePoints, decimals),
    timePoints: roundTo(timePoints, decimals),
    arrivalPoints: roundTo(arrivalPoints, decimals),
    leadingPoints: roundTo(leadingPoints, decimals),
    departurePoints: 0, // Not used in GAP2023+

    // Leading coefficient
    leadingCoefficient,

    // Penalties
    penalties,
    penaltyPoints,

    // Total
    totalPoints,
  };
}

/**
 * Round number to specified decimal places
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Score a single pilot quickly (without full task scoring)
 *
 * Useful for preview or incremental scoring.
 *
 * @param analysis Flight analysis for the pilot
 * @param stats Pre-calculated task statistics
 * @param available Pre-calculated available points
 * @param formula Scoring formula configuration
 * @param allAnalyses All pilot analyses
 * @param speedSectionDistance Speed section distance
 * @param essAltitude ESS altitude
 * @returns Pilot result
 */
export function scoreSinglePilot(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig,
  allAnalyses: FlightAnalysis[],
  speedSectionDistance: number,
  essAltitude?: number
): PilotResult {
  // Calculate LC for this pilot (any pilot who crossed SS)
  let lcResult: ReturnType<typeof calculateLeadingCoeff> | undefined;

  if (analysis.startTime && analysis.timeDistanceGraph.length >= 2) {
    lcResult = calculateLeadingCoeff(
      analysis.timeDistanceGraph,
      formula,
      speedSectionDistance,
      essAltitude
    );
  }

  return scorePilot(
    analysis,
    stats,
    available,
    formula,
    allAnalyses,
    [],
    lcResult
  );
}
