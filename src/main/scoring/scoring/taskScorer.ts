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
import {
  calculateIv,
  calculateMissingIv,
  calculateLc,
  buildMissingGraph,
} from "../leading/leadingCalculator";
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

  // Step 5: Calculate leading coefficients using FS algorithm
  // Flow: IV → (+ missing IV for non-ESS) → normalize to LC
  const lcResults = new Map<
    number,
    { iv: number; lc: number; totalArea: number }
  >();
  const ssDistance = task.speedSectionDistance;

  // FS uses max(lastSsFinishTime, lastLandedBeforeEssTime) as reference time
  // for the missing IV calculation for non-ESS pilots.
  const lastEssTime = stats.lastFinishTime;
  const lastLandingTime = Math.max(
    ...analyses
      .filter((a) => a.startTime && !a.essTime && a.landingTime)
      .map((a) => a.landingTime!),
    0
  );
  const lastFinishTime = Math.max(lastEssTime || 0, lastLandingTime || 0);

  // FS uses SS open time as the time reference (GAP.cs line 655)
  const ssIdx = task.ssIndex - 1;
  const ssTp = task.turnpoints[ssIdx];
  const ssOpenTime = ssTp?.open ? new Date(ssTp.open).getTime() : 0;

  for (const analysis of analyses) {
    if (analysis.startTime && analysis.timeDistanceGraph.length >= 2) {
      // 1. Calculate IV from main graph
      let iv = calculateIv(analysis.timeDistanceGraph, formula, ssDistance);

      // 2. For non-ESS pilots: add missing IV
      if (iv > 0 && ssDistance > 0 && !analysis.essTime) {
        const graph = analysis.timeDistanceGraph;
        const lastPoint = graph[graph.length - 1];
        const flownSsDistance = lastPoint.dist;

        // lastTime = max(pilotLandingTime, lastFinishTime) - ssOpenTime, in seconds
        const pilotEndTime =
          analysis.landingTime || ssOpenTime + lastPoint.time * 1000;
        const refTime = Math.max(pilotEndTime, lastFinishTime);
        const lastTime = (refTime - ssOpenTime) / 1000;

        const missingGraph = buildMissingGraph(
          flownSsDistance,
          ssDistance,
          lastTime
        );
        iv += calculateMissingIv(missingGraph, formula, ssDistance);
      }

      // 3. Normalize: lc = iv / (1800 * ssDistKm)
      const lc = calculateLc(ssDistance, iv);

      lcResults.set(analysis.pilotId, {
        iv,
        lc,
        totalArea: lc,
      });
    }
  }

  // Calculate LC min from ALL pilots with lc > 0 (not just ESS pilots)
  const allLcValues = Array.from(lcResults.values())
    .map((r) => r.lc)
    .filter((lc) => lc > 0);
  stats = updateStatsWithLeadingCoeffs(stats, allLcValues);

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
  lcResult?: { iv: number; lc: number; totalArea: number }
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

  // Leading points from pre-computed LC
  let leadingPoints = 0;
  let leadingCoefficient: number | undefined;

  if (lcResult) {
    leadingCoefficient = lcResult.lc;
    const lcAsResult = {
      leadingCoeff: lcResult.lc,
      areaBeforeBest: 0,
      areaAfterBest: 0,
      totalArea: lcResult.lc,
    };
    leadingPoints = calculateLeadingPointsFromLcResult(
      lcAsResult,
      stats,
      available,
      formula
    );
  }

  // FS rounds each component to 1 decimal (MidpointRounding.AwayFromZero)
  // before summing into total (FsResult.cs lines 180-242)
  const distRounded = roundTo1Away(distancePoints);
  const timeRounded = roundTo1Away(timePoints);
  const arrRounded = roundTo1Away(arrivalPoints);
  const leadRounded = roundTo1Away(leadingPoints);

  // Sum pre-rounded components
  let totalPoints = distRounded + timeRounded + arrRounded + leadRounded;

  // Apply penalties
  const penaltyPoints = penalties.reduce((sum, p) => sum + (p.points || 0), 0);
  totalPoints = Math.max(0, totalPoints - penaltyPoints);

  // Round total to formula precision
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

    // Point breakdown (use pre-rounded values for consistency)
    distancePoints: distRounded,
    timePoints: timeRounded,
    arrivalPoints: arrRounded,
    leadingPoints: leadRounded,
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
 * Round to 1 decimal using MidpointRounding.AwayFromZero (matching C# Math.Round)
 */
function roundTo1Away(value: number): number {
  return (Math.sign(value) * Math.round(Math.abs(value) * 10)) / 10;
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
  _essAltitude?: number
): PilotResult {
  // Calculate LC for this pilot (any pilot who crossed SS)
  let lcResult: { iv: number; lc: number; totalArea: number } | undefined;

  if (analysis.startTime && analysis.timeDistanceGraph.length >= 2) {
    const iv = calculateIv(
      analysis.timeDistanceGraph,
      formula,
      speedSectionDistance
    );
    const lc = calculateLc(speedSectionDistance, iv);
    lcResult = { iv, lc, totalArea: lc };
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
