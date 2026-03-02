/**
 * Storage layer interface and factory
 */

import type {
  Competition,
  CompetitionSummary,
  CreateCompetitionData,
  TaskDefinition,
  Participant,
  ScoringFormulaConfig,
  TaskResult,
  CompetitionResult,
} from "../types";

/**
 * Competition storage interface
 * All methods are async for file system operations
 */
export interface ICompetitionStorage {
  // Competition CRUD
  createCompetition(data: CreateCompetitionData): Promise<string>;
  getCompetition(id: string): Promise<Competition | null>;
  updateCompetition(id: string, updates: Partial<Competition>): Promise<void>;
  deleteCompetition(id: string): Promise<void>;
  listCompetitions(): Promise<CompetitionSummary[]>;

  // Task operations
  addTask(compId: string, task: TaskDefinition): Promise<void>;
  getTask(compId: string, taskId: string): Promise<TaskDefinition | null>;
  updateTask(
    compId: string,
    taskId: string,
    updates: Partial<TaskDefinition>
  ): Promise<void>;
  deleteTask(compId: string, taskId: string): Promise<void>;
  getTasks(compId: string): Promise<TaskDefinition[]>;

  // Participant operations
  addParticipant(compId: string, participant: Participant): Promise<void>;
  getParticipant(
    compId: string,
    participantId: number
  ): Promise<Participant | null>;
  updateParticipant(
    compId: string,
    participantId: number,
    updates: Partial<Participant>
  ): Promise<void>;
  deleteParticipant(compId: string, participantId: number): Promise<void>;
  getParticipants(compId: string): Promise<Participant[]>;

  // Result storage
  saveTaskResults(
    compId: string,
    taskId: string,
    result: TaskResult
  ): Promise<void>;
  getTaskResults(compId: string, taskId: string): Promise<TaskResult | null>;
  saveCompetitionResults(
    compId: string,
    results: CompetitionResult
  ): Promise<void>;
  getCompetitionResults(compId: string): Promise<CompetitionResult | null>;

  // Formula management
  getScoringFormula(compId: string): Promise<ScoringFormulaConfig>;
  updateScoringFormula(
    compId: string,
    formula: Partial<ScoringFormulaConfig>
  ): Promise<void>;

  // File operations
  loadFromFile(filePath: string): Promise<Competition>;
  saveToFile(compId: string, filePath: string): Promise<void>;
}

// Re-export the file storage implementation
export {
  FileCompetitionStorage,
  createStorage,
  getDefaultStoragePath,
  migrateStorage,
} from "./fileStorage";
