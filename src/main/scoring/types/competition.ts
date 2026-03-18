/**
 * Core competition types and enums
 */

// Task type determines scoring rules
export type TaskType = "Race" | "TimeTrial" | "OpenDistance";

// Participant status within a task
export type TaskStatus = "ABS" | "DNF" | "NYP" | "DF" | "GOAL";

// Goal shape
export type GoalType = "CYLINDER" | "LINE";

// Earth model for distance calculations
export type EarthModel = "WGS84" | "FAI_SPHERE";

// Start direction for SSS cylinder
export type SSSDirection = "ENTER" | "EXIT";

// Final glide decelerator algorithm
export type FinalGlideDecelerator = "none" | "cess" | "aatb";

// Altitude type for scoring
export type ScoringAltitude = "GPS" | "QNH" | "TA";

// Task state
export type TaskState = "Regular" | "Stopped" | "Cancelled";

// Export file formats
export type ExportFormat = "csv" | "html" | "fsdb" | "json";

// Supported file types
export type FileType =
  | "xctsk"
  | "competition"
  | "igc"
  | "csv"
  | "html"
  | "fsdb";

// Participant status in competition
export type ParticipantStatus =
  | "Confirmed"
  | "Waiting"
  | "Cancelled"
  | "Withdrawn";

// Turnpoint type
export type TurnpointType = "TAKEOFF" | "SSS" | "TURNPOINT" | "ESS" | "GOAL";

// Penalty types
export type PenaltyType =
  | "JumpTheGun"
  | "AirspaceViolation"
  | "Administrative"
  | "Other";

// Leading calculator type
export type LeadingCalculatorType = "Classic" | "PWC2019" | "PWC2023";

import type { CompetitionCategory, TeamDefinition } from "./category";
import type { ScoringFormulaConfig } from "./formula";
import type { Participant } from "./participant";
import type { TaskDefinition } from "./task";

/**
 * Full competition data structure
 */
export interface Competition {
  id: string;
  name: string;
  location: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  timeZone: string; // IANA timezone
  formula: ScoringFormulaConfig;
  participants: Participant[];
  tasks: TaskDefinition[];
  taskOrder?: string[];
  categories?: CompetitionCategory[];
  teams?: TeamDefinition[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Competition list item (summary without full data)
 */
export interface CompetitionSummary {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  participantCount: number;
  taskCount: number;
  scoredTaskCount: number;
}

/**
 * Data required to create a new competition
 */
export interface CreateCompetitionData {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  timeZone?: string;
  formulaName?: string;
}

/**
 * Export options for results
 */
export interface ExportOptions {
  format: ExportFormat;
  includeTaskResults: boolean;
  includeStandings: boolean;
  includeCategories?: boolean;
  includeTeams?: boolean;
}
