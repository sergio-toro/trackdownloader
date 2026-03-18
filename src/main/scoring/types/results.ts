/**
 * Scoring result types
 */

import type { Penalty, TaskParticipant } from "./participant";

/**
 * Task statistics for scoring calculations
 */
export interface TaskStatistics {
  // Pilot counts
  pilotsPresent: number;
  pilotsFlying: number;
  pilotsLaunched: number;
  pilotsLandedBeforeDeadline: number;

  // Goal stats
  pilotsInGoal: number;
  pilotsReachedESS: number;

  // Distance stats (meters)
  bestDistance: number;
  taskDistance: number;
  sumOfFlownDistancesOverMin: number;
  maxDistanceOverMin: number;
  minDistance: number;

  // Time stats
  bestTime: number; // seconds
  bestFinishTime: number; // timestamp
  lastFinishTime: number; // timestamp

  // Leading stats
  sumOfLeadingCoeffs: number;
  smallestLeadingCoeff: number;
  leadingWeightFactor: number;

  // Nominal values
  nominalDistance: number;
  nominalTime: number;
  nominalGoal: number;
  nominalLaunch: number;
}

/**
 * Point weights (sums to 1)
 */
export interface PointWeights {
  distanceWeight: number; // 0-1
  timeWeight: number; // 0-1
  arrivalWeight: number; // 0-1
  leadingWeight: number; // 0-1
  departureWeight: number; // 0-1
}

/**
 * Available points for a task
 */
export interface AvailablePoints {
  totalAvailable: number; // Max ~1000
  distanceAvailable: number;
  timeAvailable: number;
  arrivalAvailable: number;
  leadingAvailable: number;
  departureAvailable: number;
}

/**
 * Scoring parameters calculated for a task
 */
export interface TaskScoreParams {
  // Validity scores (0-1)
  timeValidity: number;
  launchValidity: number;
  distanceValidity: number;
  stopValidity: number;
  dayQuality: number;

  // Point distribution
  weights: PointWeights;
  availablePoints: AvailablePoints;

  // Statistics
  statistics: TaskStatistics;
}

/**
 * Individual pilot result for a task
 */
export interface PilotResult {
  pilotId: number;
  rank: number;

  // Flight data
  distance: number; // meters
  time: number | null; // seconds (null if no goal)
  reachedGoal: boolean;
  reachedESS: boolean;

  // Point breakdown
  distancePoints: number;
  timePoints: number;
  arrivalPoints: number;
  leadingPoints: number;
  departurePoints: number;

  // Leading coefficient
  leadingCoefficient?: number;

  // Penalties
  penalties: Penalty[];
  penaltyPoints: number;

  // Total
  totalPoints: number;
}

/**
 * Full task result with all pilot scores
 */
export interface TaskResult {
  taskId: string;
  taskName: string;
  taskDate: string;
  scoredAt: string;
  formula: string;
  categoryName?: string; // undefined or "Overall" for default

  // Validity scores (0-1)
  timeValidity: number;
  launchValidity: number;
  distanceValidity: number;
  stopValidity: number;
  dayQuality: number;

  // Available points
  availablePoints: AvailablePoints;

  // Statistics
  statistics: TaskStatistics;

  // Pilot results
  pilotResults: PilotResult[];
}

/**
 * Task result extended from TaskParticipant (alternative structure)
 */
export interface TaskResultExtended extends TaskParticipant {
  distancePoints: number;
  timePoints: number;
  arrivalPoints: number;
  departurePoints: number;
  leadingPoints: number;
  leadingCoefficient?: number;
  totalPoints: number;
  points: number;
  rank: number;
}

/**
 * Points per task for overall standings
 */
export interface TaskScore {
  taskId: string;
  taskIndex: number;
  points: number;
  relativeScore: number; // 0-1 relative to winner
  countingPoints: number; // After FTV adjustments
  counting: boolean; // Whether task counts
}

/**
 * Per-task score in overall standings, preserving both original and FTV-adjusted values
 */
export interface TaskStandingScore {
  originalPoints: number; // Raw task score before FTV
  countingPoints: number; // FTV-adjusted counting score
  counting: boolean; // true = fully counted, false = partial or discarded
}

/**
 * Competition standing for a participant
 */
export interface CompetitionStanding {
  participantId: number;
  rank: number;
  totalPoints: number;
  taskScores: Record<string, TaskStandingScore>; // taskId -> score details
  discardedTasks: string[]; // taskIds not counting (fully discarded, countingPoints=0)
  tasksFlown: number;
}

/**
 * Overall competition result
 */
export interface CompetitionResult {
  competitionId: string;
  scoredAt: string;
  taskCount: number;
  scoredTaskCount: number;
  categoryName?: string; // undefined or "Overall" for default
  standings: CompetitionStanding[];
}

/**
 * Individual team member's score for a task
 */
export interface TeamMemberScore {
  participantId: number;
  points: number;
  counting: boolean;
}

/**
 * Team score for a single task
 */
export interface TeamTaskScore {
  taskId: string;
  teamPoints: number;
  members: TeamMemberScore[];
}

/**
 * A team's overall standing
 */
export interface TeamStanding {
  teamName: string; // Attribute value, e.g., "ESP", "FRA"
  rank: number;
  totalPoints: number;
  taskScores: TeamTaskScore[];
}

/**
 * Team classification result
 */
export interface TeamResult {
  competitionId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  scoredAt: string;
  standings: TeamStanding[];
}
