/**
 * Scoring types - re-exports all type definitions
 */

// Competition types
export type {
  TaskType,
  TaskStatus,
  GoalType,
  EarthModel,
  SSSDirection,
  FinalGlideDecelerator,
  ScoringAltitude,
  TaskState,
  ExportFormat,
  FileType,
  ParticipantStatus,
  TurnpointType,
  PenaltyType,
  LeadingCalculatorType,
  Competition,
  CompetitionSummary,
  CreateCompetitionData,
  ExportOptions,
} from "./competition";

// Geographic types
export type {
  GeoPoint,
  Coordinate,
  Coordinate3D,
  RectangularArea,
} from "./geo";

// Task types
export type {
  Turnpoint,
  StartGate,
  TaskDefinition,
  XCTaskImport,
} from "./task";

// Participant types
export type {
  TaskTrack,
  Participant,
  Penalty,
  ParticipantTiming,
  ParticipantAltitudes,
  TaskParticipant,
} from "./participant";

// Result types
export type {
  TaskStatistics,
  PointWeights,
  AvailablePoints,
  TaskScoreParams,
  PilotResult,
  TaskResult,
  TaskResultExtended,
  TaskScore,
  TaskStandingScore,
  CompetitionStanding,
  CompetitionResult,
} from "./results";

// Formula types
export type { FormulaId, ScoringFormulaConfig } from "./formula";

// Formula defaults and utilities
export {
  GAP2023_PG_DEFAULTS,
  GAP2025_PG_DEFAULTS,
  getDefaultFormula,
} from "./formula";

// Flight analysis types
export type {
  FlightFix,
  TurnpointCrossing,
  TimeDist,
  DistanceResult,
  FlightAnalysis,
  FlightAnalysisOptions,
} from "./flightAnalysis";

// Waypoint library types
export type {
  LibraryWaypoint,
  WaypointFilter,
  CupImportResult,
  WaypointLibraryData,
} from "./waypoint";
