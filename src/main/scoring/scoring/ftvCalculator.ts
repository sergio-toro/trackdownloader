/**
 * FTV (Fixed Total Validity) Calculator
 *
 * Calculates competition standings using FTV to discard worst-performing tasks.
 * FTV ensures that the total counting points equals a fixed percentage of maximum possible.
 */

import type {
  CompetitionStanding,
  CompetitionResult,
  TaskResult,
  PilotResult,
} from "../types/results";
import type { ScoringFormulaConfig } from "../types/formula";
import type { Participant } from "../types/participant";

/**
 * Pilot task score for FTV calculation
 */
interface PilotTaskScore {
  taskId: string;
  taskIndex: number;
  points: number;
  maxPoints: number;
  relativeScore: number; // points / maxPoints (0-1)
}

/**
 * FTV calculation result for a pilot
 */
interface FtvResult {
  participantId: number;
  totalPoints: number;
  taskScores: Map<
    string,
    { originalPoints: number; countingPoints: number; counting: boolean }
  >;
  discardedTasks: string[];
}

/**
 * Calculate competition standings with FTV
 *
 * @param taskResults All scored task results
 * @param participants Competition participants
 * @param formula Scoring formula with FTV settings
 * @returns Competition result with standings
 */
export function calculateCompetitionStandings(
  taskResults: TaskResult[],
  participants: Participant[],
  formula: ScoringFormulaConfig
): CompetitionResult {
  // Build pilot ID to participant map
  const participantMap = new Map<number, Participant>();
  for (const p of participants) {
    participantMap.set(p.id, p);
  }

  // Collect all pilot task scores
  const pilotScores = collectPilotScores(taskResults, formula);

  // Calculate total max points across all tasks
  const taskMaxPoints = new Map<string, number>();
  for (const taskResult of taskResults) {
    const maxPoints = formula.useBestScoreForFtvValidity
      ? Math.max(...taskResult.pilotResults.map((r) => r.totalPoints), 0)
      : 1000 * taskResult.dayQuality;
    taskMaxPoints.set(taskResult.taskId, maxPoints);
  }

  const totalMaxPoints = Array.from(taskMaxPoints.values()).reduce(
    (sum, max) => sum + max,
    0
  );

  // Calculate FTV target (0 = no FTV, use full points)
  const ftvFactor = formula.ftvFactor;
  const ftvTarget =
    ftvFactor > 0 ? totalMaxPoints * (1 - ftvFactor) : totalMaxPoints;

  // Apply FTV to each pilot
  const ftvResults: FtvResult[] = [];

  for (const [pilotId, scores] of pilotScores) {
    const result = applyFtv(
      pilotId,
      scores,
      taskMaxPoints,
      ftvTarget,
      ftvFactor
    );
    ftvResults.push(result);
  }

  // Convert to standings, round, then calculate ranks
  const standings = buildStandings(ftvResults, taskResults.length);

  // Round to formula precision before ranking so ties are detected correctly
  const decimals = formula.numberOfDecimalsCompetitionResults;
  for (const standing of standings) {
    standing.totalPoints = roundTo(standing.totalPoints, decimals);
  }

  calculateRanks(standings);

  return {
    competitionId: "", // Set by caller
    scoredAt: new Date().toISOString(),
    taskCount: taskResults.length,
    scoredTaskCount: taskResults.length,
    standings,
  };
}

/**
 * Collect all pilot scores from task results
 */
function collectPilotScores(
  taskResults: TaskResult[],
  formula: ScoringFormulaConfig
): Map<number, PilotTaskScore[]> {
  const pilotScores = new Map<number, PilotTaskScore[]>();

  for (let taskIndex = 0; taskIndex < taskResults.length; taskIndex++) {
    const taskResult = taskResults[taskIndex];
    const maxPoints = Math.max(
      formula.useBestScoreForFtvValidity
        ? Math.max(...taskResult.pilotResults.map((r) => r.totalPoints), 0)
        : 1000 * taskResult.dayQuality,
      1 // Avoid division by zero
    );

    for (const pilotResult of taskResult.pilotResults) {
      const scores = pilotScores.get(pilotResult.pilotId) || [];

      scores.push({
        taskId: taskResult.taskId,
        taskIndex,
        points: pilotResult.totalPoints,
        maxPoints,
        relativeScore: maxPoints > 0 ? pilotResult.totalPoints / maxPoints : 0,
      });

      pilotScores.set(pilotResult.pilotId, scores);
    }
  }

  return pilotScores;
}

/**
 * Apply FTV algorithm to a single pilot
 *
 * FTV works by:
 * 1. Sort tasks by relative performance (best first)
 * 2. Accumulate points from best to worst
 * 3. Discard tasks that would exceed the FTV target
 * 4. Partially count the last task if it crosses the threshold
 *
 * @param pilotId Pilot ID
 * @param scores Pilot's task scores
 * @param taskMaxPoints Max points per task
 * @param ftvTarget Target total points
 * @param ftvFactor FTV factor (0 = no FTV)
 * @returns FTV result with counting/discarded tasks
 */
function applyFtv(
  pilotId: number,
  scores: PilotTaskScore[],
  taskMaxPoints: Map<string, number>,
  ftvTarget: number,
  ftvFactor: number
): FtvResult {
  const taskScores = new Map<
    string,
    { originalPoints: number; countingPoints: number; counting: boolean }
  >();
  const discardedTasks: string[] = [];

  // If no FTV (factor = 0), count all tasks fully
  if (ftvFactor === 0) {
    let totalPoints = 0;
    for (const score of scores) {
      taskScores.set(score.taskId, {
        originalPoints: score.points,
        countingPoints: score.points,
        counting: true,
      });
      totalPoints += score.points;
    }
    return { participantId: pilotId, totalPoints, taskScores, discardedTasks };
  }

  // Sort by relative performance (best first)
  const sortedScores = [...scores].sort(
    (a, b) => b.relativeScore - a.relativeScore
  );

  let accumulatedValidity = 0;
  let totalPoints = 0;

  for (const score of sortedScores) {
    const maxPoints = taskMaxPoints.get(score.taskId) || 0;
    const taskValidity = maxPoints; // Validity contribution = max points for this task

    // Check if adding this task would exceed target
    if (accumulatedValidity + taskValidity <= ftvTarget) {
      // Fully count this task
      taskScores.set(score.taskId, {
        originalPoints: score.points,
        countingPoints: score.points,
        counting: true,
      });
      totalPoints += score.points;
      accumulatedValidity += taskValidity;
    } else if (accumulatedValidity < ftvTarget) {
      // Partially count this task
      const remainingValidity = ftvTarget - accumulatedValidity;
      const partialFactor = remainingValidity / taskValidity;
      const partialPoints = score.points * partialFactor;

      taskScores.set(score.taskId, {
        originalPoints: score.points,
        countingPoints: partialPoints,
        counting: false,
      });
      totalPoints += partialPoints;
      accumulatedValidity = ftvTarget;
    } else {
      // Discard this task
      taskScores.set(score.taskId, {
        originalPoints: score.points,
        countingPoints: 0,
        counting: false,
      });
      discardedTasks.push(score.taskId);
    }
  }

  return { participantId: pilotId, totalPoints, taskScores, discardedTasks };
}

/**
 * Build standings from FTV results
 */
function buildStandings(
  ftvResults: FtvResult[],
  _taskCount: number
): CompetitionStanding[] {
  return ftvResults.map((result) => {
    const taskScores: Record<
      string,
      { originalPoints: number; countingPoints: number; counting: boolean }
    > = {};
    for (const [taskId, score] of result.taskScores) {
      taskScores[taskId] = score;
    }

    return {
      participantId: result.participantId,
      rank: 0, // Set later
      totalPoints: result.totalPoints,
      taskScores,
      discardedTasks: result.discardedTasks,
      tasksFlown: result.taskScores.size,
    };
  });
}

/**
 * Calculate ranks with tie handling
 *
 * Standard competition ranking (1, 2, 2, 4 for ties)
 */
function calculateRanks(standings: CompetitionStanding[]): void {
  // Sort by total points descending
  standings.sort((a, b) => b.totalPoints - a.totalPoints);

  let rank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0 && standings[i].totalPoints < standings[i - 1].totalPoints) {
      rank = i + 1;
    }
    standings[i].rank = rank;
  }
}

/**
 * Round to decimal places
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Get pilot result from task result
 */
export function getPilotTaskResult(
  taskResult: TaskResult,
  pilotId: number
): PilotResult | undefined {
  return taskResult.pilotResults.find((r) => r.pilotId === pilotId);
}

/**
 * Calculate simple standings without FTV (sum all task points)
 *
 * Useful when ftvFactor = 0 or for quick calculations
 */
export function calculateSimpleStandings(
  taskResults: TaskResult[],
  _participants: Participant[]
): CompetitionStanding[] {
  const pilotTotals = new Map<
    number,
    {
      total: number;
      taskScores: Record<
        string,
        { originalPoints: number; countingPoints: number; counting: boolean }
      >;
      tasksFlown: number;
    }
  >();

  // Sum all task points per pilot
  for (const taskResult of taskResults) {
    for (const pilotResult of taskResult.pilotResults) {
      const existing = pilotTotals.get(pilotResult.pilotId) || {
        total: 0,
        taskScores: {},
        tasksFlown: 0,
      };

      existing.total += pilotResult.totalPoints;
      existing.taskScores[taskResult.taskId] = {
        originalPoints: pilotResult.totalPoints,
        countingPoints: pilotResult.totalPoints,
        counting: true,
      };
      existing.tasksFlown++;

      pilotTotals.set(pilotResult.pilotId, existing);
    }
  }

  // Convert to standings
  const standings: CompetitionStanding[] = [];
  for (const [participantId, data] of pilotTotals) {
    standings.push({
      participantId,
      rank: 0,
      totalPoints: data.total,
      taskScores: data.taskScores,
      discardedTasks: [],
      tasksFlown: data.tasksFlown,
    });
  }

  // Calculate ranks
  calculateRanks(standings);

  return standings;
}
