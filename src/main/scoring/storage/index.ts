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
  TeamResult,
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
  setParticipants(compId: string, participants: Participant[]): Promise<void>;

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

  // Category result storage
  saveCategoryTaskResults(
    compId: string,
    taskId: string,
    categoryId: string,
    result: TaskResult
  ): Promise<void>;
  getCategoryTaskResults(
    compId: string,
    taskId: string,
    categoryId: string
  ): Promise<TaskResult | null>;
  getAllCategoryTaskResults(
    compId: string,
    taskId: string
  ): Promise<Record<string, TaskResult>>;
  saveCategoryCompetitionResults(
    compId: string,
    categoryId: string,
    result: CompetitionResult
  ): Promise<void>;
  getCategoryCompetitionResults(
    compId: string,
    categoryId: string
  ): Promise<CompetitionResult | null>;

  // Team result storage
  saveTeamResults(
    compId: string,
    teamDefId: string,
    result: TeamResult
  ): Promise<void>;
  getTeamResults(compId: string, teamDefId: string): Promise<TeamResult | null>;

  // Formula management
  getScoringFormula(compId: string): Promise<ScoringFormulaConfig>;
  updateScoringFormula(
    compId: string,
    formula: Partial<ScoringFormulaConfig>
  ): Promise<void>;

  // ID listing (for uniqueness validation)
  listCompetitionIds(): Promise<string[]>;
  listTaskIds(compId: string): Promise<string[]>;

  // Category/Team ID rename
  renameCategoryId(compId: string, oldId: string, newId: string): Promise<void>;
  renameTeamId(compId: string, oldId: string, newId: string): Promise<void>;

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
