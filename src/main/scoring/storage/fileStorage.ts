/**
 * File-based competition storage implementation
 */

import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";

import type { ICompetitionStorage } from "./index";
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
import { getDefaultFormula } from "../types";

/**
 * Directory structure:
 * ~/trackdownloader/competitions/
 *   {competition-id}/
 *     competition.json    - metadata
 *     formula.json        - scoring formula
 *     participants.json   - participant list
 *     tasks/
 *       {task-id}.json    - task definitions
 *     results/
 *       {task-id}.json    - task results
 *     overall-results.json - competition results
 */

export class FileCompetitionStorage implements ICompetitionStorage {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir =
      baseDir || path.join(app.getPath("userData"), "competitions");
  }

  // Helper methods

  private compDir(compId: string): string {
    return path.join(this.baseDir, compId);
  }

  private tasksDir(compId: string): string {
    return path.join(this.compDir(compId), "tasks");
  }

  private resultsDir(compId: string): string {
    return path.join(this.compDir(compId), "results");
  }

  private async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  private async writeJson<T>(filePath: string, data: T): Promise<void> {
    await this.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Competition CRUD

  async createCompetition(data: CreateCompetitionData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const formula = getDefaultFormula(
      data.formulaName === "GAP2025" ? "GAP2025" : "GAP2023"
    );

    const competition: Competition = {
      id,
      name: data.name,
      location: data.location,
      startDate: data.startDate,
      endDate: data.endDate,
      timeZone: data.timeZone || "UTC",
      formula,
      participants: [],
      tasks: [],
      createdAt: now,
      updatedAt: now,
    };

    const compDir = this.compDir(id);
    await this.ensureDir(compDir);
    await this.ensureDir(this.tasksDir(id));
    await this.ensureDir(this.resultsDir(id));

    // Save competition metadata (without participants and tasks)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { participants, tasks, formula: f, ...metadata } = competition;
    await this.writeJson(path.join(compDir, "competition.json"), metadata);

    // Save formula separately
    await this.writeJson(path.join(compDir, "formula.json"), f);

    // Initialize empty participants
    await this.writeJson(path.join(compDir, "participants.json"), []);

    console.log(`Created competition: ${id} - ${data.name}`);
    return id;
  }

  async getCompetition(id: string): Promise<Competition | null> {
    const compDir = this.compDir(id);

    const metadata = await this.readJson<
      Omit<Competition, "participants" | "tasks" | "formula">
    >(path.join(compDir, "competition.json"));
    if (!metadata) return null;

    const formula =
      (await this.readJson<ScoringFormulaConfig>(
        path.join(compDir, "formula.json")
      )) || getDefaultFormula("GAP2023");

    const participants =
      (await this.readJson<Participant[]>(
        path.join(compDir, "participants.json")
      )) || [];

    const tasks = await this.getTasks(id);

    return {
      ...metadata,
      formula,
      participants,
      tasks,
    };
  }

  async updateCompetition(
    id: string,
    updates: Partial<Competition>
  ): Promise<void> {
    const compDir = this.compDir(id);
    const metadataPath = path.join(compDir, "competition.json");

    const current =
      await this.readJson<
        Omit<Competition, "participants" | "tasks" | "formula">
      >(metadataPath);
    if (!current) {
      throw new Error(`Competition not found: ${id}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { participants, tasks, formula, ...metadataUpdates } = updates;

    // Update metadata
    const updated = {
      ...current,
      ...metadataUpdates,
      updatedAt: new Date().toISOString(),
    };
    await this.writeJson(metadataPath, updated);

    // Update formula if provided
    if (formula) {
      await this.writeJson(path.join(compDir, "formula.json"), formula);
    }

    // Participants and tasks are managed separately
    console.log(`Updated competition: ${id}`);
  }

  async deleteCompetition(id: string): Promise<void> {
    const compDir = this.compDir(id);
    if (await this.exists(compDir)) {
      await fs.rm(compDir, { recursive: true });
      console.log(`Deleted competition: ${id}`);
    }
  }

  async listCompetitions(): Promise<CompetitionSummary[]> {
    await this.ensureDir(this.baseDir);

    const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
    const summaries: CompetitionSummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const compDir = path.join(this.baseDir, entry.name);
      const metadata = await this.readJson<{
        id: string;
        name: string;
        location: string;
        startDate: string;
        endDate: string;
      }>(path.join(compDir, "competition.json"));
      if (!metadata) continue;

      const participants =
        (await this.readJson<Participant[]>(
          path.join(compDir, "participants.json")
        )) || [];

      const tasks = await this.getTasks(entry.name);
      const scoredTaskCount = tasks.filter((t) => t.scoredAt).length;

      summaries.push({
        id: metadata.id,
        name: metadata.name,
        location: metadata.location,
        startDate: metadata.startDate,
        endDate: metadata.endDate,
        participantCount: participants.length,
        taskCount: tasks.length,
        scoredTaskCount,
      });
    }

    // Sort by start date descending
    summaries.sort((a, b) => b.startDate.localeCompare(a.startDate));
    return summaries;
  }

  // Task operations

  async addTask(compId: string, task: TaskDefinition): Promise<void> {
    const taskPath = path.join(this.tasksDir(compId), `${task.id}.json`);
    await this.writeJson(taskPath, task);
    await this.touchCompetition(compId);
    console.log(`Added task: ${task.id} to competition ${compId}`);
  }

  async getTask(
    compId: string,
    taskId: string
  ): Promise<TaskDefinition | null> {
    const taskPath = path.join(this.tasksDir(compId), `${taskId}.json`);
    return this.readJson<TaskDefinition>(taskPath);
  }

  async updateTask(
    compId: string,
    taskId: string,
    updates: Partial<TaskDefinition>
  ): Promise<void> {
    const taskPath = path.join(this.tasksDir(compId), `${taskId}.json`);
    const current = await this.readJson<TaskDefinition>(taskPath);
    if (!current) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updated = { ...current, ...updates };
    await this.writeJson(taskPath, updated);
    await this.touchCompetition(compId);
    console.log(`Updated task: ${taskId}`);
  }

  async deleteTask(compId: string, taskId: string): Promise<void> {
    const taskPath = path.join(this.tasksDir(compId), `${taskId}.json`);
    if (await this.exists(taskPath)) {
      await fs.unlink(taskPath);
      await this.touchCompetition(compId);
      console.log(`Deleted task: ${taskId}`);
    }

    // Also delete task results
    const resultPath = path.join(this.resultsDir(compId), `${taskId}.json`);
    if (await this.exists(resultPath)) {
      await fs.unlink(resultPath);
    }
  }

  async getTasks(compId: string): Promise<TaskDefinition[]> {
    const tasksDir = this.tasksDir(compId);
    if (!(await this.exists(tasksDir))) return [];

    const files = await fs.readdir(tasksDir);
    const tasks: TaskDefinition[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const task = await this.readJson<TaskDefinition>(
        path.join(tasksDir, file)
      );
      if (task) tasks.push(task);
    }

    // Sort by date
    tasks.sort((a, b) => a.date.localeCompare(b.date));
    return tasks;
  }

  // Participant operations

  async addParticipant(
    compId: string,
    participant: Participant
  ): Promise<void> {
    const participants = await this.getParticipants(compId);

    // Check for duplicate ID
    if (participants.some((p) => p.id === participant.id)) {
      throw new Error(`Participant with ID ${participant.id} already exists`);
    }

    participants.push(participant);
    await this.writeJson(
      path.join(this.compDir(compId), "participants.json"),
      participants
    );
    await this.touchCompetition(compId);
    console.log(`Added participant: ${participant.id} - ${participant.name}`);
  }

  async getParticipant(
    compId: string,
    participantId: number
  ): Promise<Participant | null> {
    const participants = await this.getParticipants(compId);
    return participants.find((p) => p.id === participantId) || null;
  }

  async updateParticipant(
    compId: string,
    participantId: number,
    updates: Partial<Participant>
  ): Promise<void> {
    const participants = await this.getParticipants(compId);
    const index = participants.findIndex((p) => p.id === participantId);

    if (index === -1) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    participants[index] = { ...participants[index], ...updates };
    await this.writeJson(
      path.join(this.compDir(compId), "participants.json"),
      participants
    );
    await this.touchCompetition(compId);
    console.log(`Updated participant: ${participantId}`);
  }

  async deleteParticipant(
    compId: string,
    participantId: number
  ): Promise<void> {
    const participants = await this.getParticipants(compId);
    const filtered = participants.filter((p) => p.id !== participantId);

    if (filtered.length === participants.length) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    await this.writeJson(
      path.join(this.compDir(compId), "participants.json"),
      filtered
    );
    await this.touchCompetition(compId);
    console.log(`Deleted participant: ${participantId}`);
  }

  async getParticipants(compId: string): Promise<Participant[]> {
    const participants = await this.readJson<Participant[]>(
      path.join(this.compDir(compId), "participants.json")
    );
    return participants || [];
  }

  // Result storage

  async saveTaskResults(
    compId: string,
    taskId: string,
    result: TaskResult
  ): Promise<void> {
    const resultPath = path.join(this.resultsDir(compId), `${taskId}.json`);
    await this.writeJson(resultPath, result);

    // Update task scoredAt
    await this.updateTask(compId, taskId, { scoredAt: result.scoredAt });
    console.log(`Saved results for task: ${taskId}`);
  }

  async getTaskResults(
    compId: string,
    taskId: string
  ): Promise<TaskResult | null> {
    const resultPath = path.join(this.resultsDir(compId), `${taskId}.json`);
    return this.readJson<TaskResult>(resultPath);
  }

  async saveCompetitionResults(
    compId: string,
    results: CompetitionResult
  ): Promise<void> {
    const resultPath = path.join(this.compDir(compId), "overall-results.json");
    await this.writeJson(resultPath, results);
    console.log(`Saved competition results: ${compId}`);
  }

  async getCompetitionResults(
    compId: string
  ): Promise<CompetitionResult | null> {
    const resultPath = path.join(this.compDir(compId), "overall-results.json");
    return this.readJson<CompetitionResult>(resultPath);
  }

  // Formula management

  async getScoringFormula(compId: string): Promise<ScoringFormulaConfig> {
    const formula = await this.readJson<ScoringFormulaConfig>(
      path.join(this.compDir(compId), "formula.json")
    );
    return formula || getDefaultFormula("GAP2023");
  }

  async updateScoringFormula(
    compId: string,
    formula: Partial<ScoringFormulaConfig>
  ): Promise<void> {
    const current = await this.getScoringFormula(compId);
    const updated = { ...current, ...formula };
    await this.writeJson(
      path.join(this.compDir(compId), "formula.json"),
      updated
    );
    await this.touchCompetition(compId);
    console.log(`Updated formula for competition: ${compId}`);
  }

  // File operations

  async loadFromFile(filePath: string): Promise<Competition> {
    const content = await fs.readFile(filePath, "utf-8");
    const competition = JSON.parse(content) as Competition;

    // Validate required fields
    if (!competition.id || !competition.name) {
      throw new Error("Invalid competition file: missing id or name");
    }

    // Import into storage
    const compDir = this.compDir(competition.id);
    if (await this.exists(compDir)) {
      throw new Error(`Competition already exists: ${competition.id}`);
    }

    await this.ensureDir(compDir);
    await this.ensureDir(this.tasksDir(competition.id));
    await this.ensureDir(this.resultsDir(competition.id));

    // Save components
    const { participants, tasks, formula, ...metadata } = competition;
    await this.writeJson(path.join(compDir, "competition.json"), metadata);
    await this.writeJson(path.join(compDir, "formula.json"), formula);
    await this.writeJson(path.join(compDir, "participants.json"), participants);

    for (const task of tasks) {
      await this.addTask(competition.id, task);
    }

    console.log(`Loaded competition from file: ${filePath}`);
    return competition;
  }

  async saveToFile(compId: string, filePath: string): Promise<void> {
    const competition = await this.getCompetition(compId);
    if (!competition) {
      throw new Error(`Competition not found: ${compId}`);
    }

    await fs.writeFile(filePath, JSON.stringify(competition, null, 2), "utf-8");
    console.log(`Saved competition to file: ${filePath}`);
  }

  // Private helpers

  private async touchCompetition(compId: string): Promise<void> {
    const metadataPath = path.join(this.compDir(compId), "competition.json");
    const metadata = await this.readJson<{ updatedAt: string }>(metadataPath);
    if (metadata) {
      metadata.updatedAt = new Date().toISOString();
      await this.writeJson(metadataPath, metadata);
    }
  }
}

/**
 * Create storage instance
 */
export function createStorage(baseDir?: string): ICompetitionStorage {
  return new FileCompetitionStorage(baseDir);
}
