/**
 * Preload script for scoring module
 * Exposes scoring methods to the renderer process
 */

import { contextBridge, ipcRenderer } from "electron";
import type {
  Competition,
  CompetitionSummary,
  CreateCompetitionData,
  TaskDefinition,
  Participant,
  ScoringFormulaConfig,
  TaskResult,
  CompetitionResult,
  FlightAnalysis,
  FlightFix,
  FlightAnalysisOptions,
  FormulaId,
  LibraryWaypoint,
  WaypointFilter,
  CupImportResult,
} from "../types";

/**
 * Methods exposed to the renderer via window.scoring
 */
export interface ScoringMethods {
  // Storage path management
  getStoragePath: () => Promise<string>;
  setStoragePath: (path: string, migrate: boolean) => Promise<void>;
  getTemporalPath: () => Promise<string>;

  // Competition management
  createCompetition: (data: CreateCompetitionData) => Promise<string>;
  loadCompetition: (id: string) => Promise<Competition | null>;
  updateCompetition: (
    id: string,
    updates: Partial<Competition>
  ) => Promise<void>;
  deleteCompetition: (id: string) => Promise<void>;
  listCompetitions: () => Promise<CompetitionSummary[]>;

  // Task management
  addTask: (compId: string, task: TaskDefinition) => Promise<void>;
  getTask: (compId: string, taskId: string) => Promise<TaskDefinition | null>;
  updateTask: (
    compId: string,
    taskId: string,
    updates: Partial<TaskDefinition>
  ) => Promise<void>;
  deleteTask: (compId: string, taskId: string) => Promise<void>;
  getTasks: (compId: string) => Promise<TaskDefinition[]>;

  // Participant management
  addParticipant: (compId: string, participant: Participant) => Promise<void>;
  getParticipant: (
    compId: string,
    participantId: number
  ) => Promise<Participant | null>;
  updateParticipant: (
    compId: string,
    participantId: number,
    updates: Partial<Participant>
  ) => Promise<void>;
  deleteParticipant: (compId: string, participantId: number) => Promise<void>;
  getParticipants: (compId: string) => Promise<Participant[]>;

  // Results management
  saveTaskResults: (
    compId: string,
    taskId: string,
    results: TaskResult
  ) => Promise<void>;
  getTaskResults: (
    compId: string,
    taskId: string
  ) => Promise<TaskResult | null>;
  saveCompetitionResults: (
    compId: string,
    results: CompetitionResult
  ) => Promise<void>;
  getCompetitionResults: (compId: string) => Promise<CompetitionResult | null>;

  // Formula management
  getFormula: (compId: string) => Promise<ScoringFormulaConfig>;
  updateFormula: (
    compId: string,
    formula: Partial<ScoringFormulaConfig>
  ) => Promise<void>;

  // File operations
  loadFromFile: (filePath: string) => Promise<Competition>;
  saveToFile: (compId: string, filePath: string) => Promise<void>;

  // File dialogs
  selectFile: (
    type: "xctsk" | "igc" | "csv" | "json"
  ) => Promise<string | null>;
  selectFiles: (type: "igc") => Promise<string[]>;
  selectSavePath: (
    defaultName: string,
    type: "json" | "csv" | "html"
  ) => Promise<string | null>;
  selectDirectory: () => Promise<string | null>;

  // Task import
  importXctsk: (filePath: string) => Promise<TaskDefinition>;
  previewXctsk: (filePath: string) => Promise<{
    valid: boolean;
    name: string;
    turnpointCount: number;
    taskType: string;
    earthModel: string;
    startGates: string[];
    deadline: string;
    errors: string[];
  }>;

  // Flight analysis
  analyzeFlight: (
    igcPath: string,
    task: TaskDefinition,
    pilotId: number,
    options?: Partial<FlightAnalysisOptions>
  ) => Promise<FlightAnalysis>;
  readIgc: (igcPath: string) => Promise<FlightFix[]>;

  // Task scoring
  scoreTask: (
    compId: string,
    taskId: string,
    formulaId?: FormulaId
  ) => Promise<TaskResult>;
  scoreTaskWithAnalyses: (
    task: TaskDefinition,
    analyses: FlightAnalysis[],
    formulaId?: FormulaId
  ) => Promise<TaskResult>;

  // Waypoint library management
  listWaypoints: (filter?: WaypointFilter) => Promise<LibraryWaypoint[]>;
  addWaypoint: (
    waypoint: Omit<LibraryWaypoint, "id" | "createdAt" | "updatedAt">
  ) => Promise<LibraryWaypoint>;
  updateWaypoint: (
    id: string,
    updates: Partial<Omit<LibraryWaypoint, "id" | "createdAt">>
  ) => Promise<LibraryWaypoint>;
  deleteWaypoint: (id: string) => Promise<void>;
  deleteWaypoints: (ids: string[]) => Promise<void>;
  importCup: (filePath?: string) => Promise<CupImportResult | null>;
}

const scoring: ScoringMethods = {
  // Storage path management
  getStoragePath: () => ipcRenderer.invoke("scoring-get-storage-path"),
  setStoragePath: (path, migrate) =>
    ipcRenderer.invoke("scoring-set-storage-path", path, migrate),
  getTemporalPath: () => ipcRenderer.invoke("scoring-get-temporal-path"),

  // Competition management
  createCompetition: (data) =>
    ipcRenderer.invoke("scoring-create-competition", data),
  loadCompetition: (id) => ipcRenderer.invoke("scoring-load-competition", id),
  updateCompetition: (id, updates) =>
    ipcRenderer.invoke("scoring-update-competition", id, updates),
  deleteCompetition: (id) =>
    ipcRenderer.invoke("scoring-delete-competition", id),
  listCompetitions: () => ipcRenderer.invoke("scoring-list-competitions"),

  // Task management
  addTask: (compId, task) =>
    ipcRenderer.invoke("scoring-add-task", compId, task),
  getTask: (compId, taskId) =>
    ipcRenderer.invoke("scoring-get-task", compId, taskId),
  updateTask: (compId, taskId, updates) =>
    ipcRenderer.invoke("scoring-update-task", compId, taskId, updates),
  deleteTask: (compId, taskId) =>
    ipcRenderer.invoke("scoring-delete-task", compId, taskId),
  getTasks: (compId) => ipcRenderer.invoke("scoring-get-tasks", compId),

  // Participant management
  addParticipant: (compId, participant) =>
    ipcRenderer.invoke("scoring-add-participant", compId, participant),
  getParticipant: (compId, participantId) =>
    ipcRenderer.invoke("scoring-get-participant", compId, participantId),
  updateParticipant: (compId, participantId, updates) =>
    ipcRenderer.invoke(
      "scoring-update-participant",
      compId,
      participantId,
      updates
    ),
  deleteParticipant: (compId, participantId) =>
    ipcRenderer.invoke("scoring-delete-participant", compId, participantId),
  getParticipants: (compId) =>
    ipcRenderer.invoke("scoring-get-participants", compId),

  // Results management
  saveTaskResults: (compId, taskId, results) =>
    ipcRenderer.invoke("scoring-save-task-results", compId, taskId, results),
  getTaskResults: (compId, taskId) =>
    ipcRenderer.invoke("scoring-get-task-results", compId, taskId),
  saveCompetitionResults: (compId, results) =>
    ipcRenderer.invoke("scoring-save-competition-results", compId, results),
  getCompetitionResults: (compId) =>
    ipcRenderer.invoke("scoring-get-competition-results", compId),

  // Formula management
  getFormula: (compId) => ipcRenderer.invoke("scoring-get-formula", compId),
  updateFormula: (compId, formula) =>
    ipcRenderer.invoke("scoring-update-formula", compId, formula),

  // File operations
  loadFromFile: (filePath) =>
    ipcRenderer.invoke("scoring-load-from-file", filePath),
  saveToFile: (compId, filePath) =>
    ipcRenderer.invoke("scoring-save-to-file", compId, filePath),

  // File dialogs
  selectFile: (type) => ipcRenderer.invoke("scoring-select-file", type),
  selectFiles: (type) => ipcRenderer.invoke("scoring-select-files", type),
  selectSavePath: (defaultName, type) =>
    ipcRenderer.invoke("scoring-select-save-path", defaultName, type),
  selectDirectory: () => ipcRenderer.invoke("scoring-select-directory"),

  // Task import
  importXctsk: (filePath) =>
    ipcRenderer.invoke("scoring-import-xctsk", filePath),
  previewXctsk: (filePath) =>
    ipcRenderer.invoke("scoring-preview-xctsk", filePath),

  // Flight analysis
  analyzeFlight: (igcPath, task, pilotId, options) =>
    ipcRenderer.invoke(
      "scoring-analyze-flight",
      igcPath,
      task,
      pilotId,
      options
    ),
  readIgc: (igcPath) => ipcRenderer.invoke("scoring-read-igc", igcPath),

  // Task scoring
  scoreTask: (compId, taskId, formulaId) =>
    ipcRenderer.invoke("scoring-score-task", compId, taskId, formulaId),
  scoreTaskWithAnalyses: (task, analyses, formulaId) =>
    ipcRenderer.invoke(
      "scoring-score-task-with-analyses",
      task,
      analyses,
      formulaId
    ),

  // Waypoint library management
  listWaypoints: (filter) =>
    ipcRenderer.invoke("scoring-list-waypoints", filter),
  addWaypoint: (waypoint) =>
    ipcRenderer.invoke("scoring-add-waypoint", waypoint),
  updateWaypoint: (id, updates) =>
    ipcRenderer.invoke("scoring-update-waypoint", id, updates),
  deleteWaypoint: (id) => ipcRenderer.invoke("scoring-delete-waypoint", id),
  deleteWaypoints: (ids) => ipcRenderer.invoke("scoring-delete-waypoints", ids),
  importCup: (filePath) => ipcRenderer.invoke("scoring-import-cup", filePath),
};

contextBridge.exposeInMainWorld("scoring", scoring);
