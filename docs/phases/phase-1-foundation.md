# Phase 1: Foundation

This phase establishes the TypeScript types, storage layer, IPC infrastructure, and React context for the competition classification system.

## Goals

1. Define all TypeScript interfaces
2. Create file-based competition storage
3. Implement IPC channels for competition operations
4. Create CompetitionContext for React state management

## Dependencies

- None (this is the foundational phase)

## Files to Create

```
src/main/scoring/
├── types/
│   ├── index.ts              # Re-exports all types
│   ├── competition.ts        # Core enums and types
│   ├── task.ts               # Task and Turnpoint types
│   ├── participant.ts        # Participant types
│   ├── results.ts            # Scoring result types
│   └── formula.ts            # Formula configuration
├── storage/
│   ├── competitionStorage.ts # Storage interface
│   └── fileStorage.ts        # File-based implementation
└── ipc/
    ├── registerScoringIpc.ts # IPC handlers
    └── scoringPreload.ts     # Preload bridge

src/renderer/context/
└── competitionContext.tsx    # Competition state management
```

---

## Step 1: Core Type Definitions

### 1.1 Competition Enums and Types

```typescript
// src/main/scoring/types/competition.ts

/**
 * Task types supported by the scoring system
 */
export type TaskType = 'Race' | 'TimeTrial';

/**
 * Participant task status
 * - ABS: Absent (registered but didn't show)
 * - DNF: Did Not Finish (started but didn't finish)
 * - NYP: Not Yet Processed (initial state)
 * - DF: Distance Flown (completed flight, no goal)
 * - GOAL: Reached Goal
 */
export type TaskStatus = 'ABS' | 'DNF' | 'NYP' | 'DF' | 'GOAL';

/**
 * Goal types
 */
export type GoalType = 'LINE' | 'CYLINDER';

/**
 * Earth model for distance calculations
 */
export type EarthModel = 'WGS84' | 'FAI_SPHERE';

/**
 * Speed Section Start direction
 */
export type SSSDirection = 'ENTER' | 'EXIT';

/**
 * Final glide decelerator types
 */
export type FinalGlideDecelerator = 'none' | 'cess' | 'aatb';

/**
 * Altitude scoring type
 */
export type ScoringAltitude = 'GPS' | 'QNH' | 'TRUE';

/**
 * Task state
 */
export type TaskState = 'Regular' | 'Stopped' | 'Cancelled';

/**
 * Export formats
 */
export type ExportFormat = 'csv' | 'html' | 'fsdb';

/**
 * File types for dialogs
 */
export type FileType = 'xctsk' | 'competition' | 'igc' | 'csv' | 'html' | 'fsdb';
```

### 1.2 Geographic Types

```typescript
// src/main/scoring/types/geo.ts

/**
 * A geographic point with coordinates
 */
export interface GeoPoint {
  latitude: number;   // Decimal degrees (negative = South)
  longitude: number;  // Decimal degrees (negative = West)
  altitude?: number;  // Meters
  name?: string;      // Waypoint name
}

/**
 * Rectangular bounding area
 */
export interface RectangularArea {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Coordinate for calculations
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}
```

### 1.3 Task Types

```typescript
// src/main/scoring/types/task.ts

import type { GeoPoint, GoalType, TaskType, TaskState, EarthModel } from './competition';

/**
 * A turnpoint in the task definition
 */
export interface Turnpoint {
  id: string;                 // Unique identifier
  geopoint: GeoPoint;         // Location
  radius: number;             // Cylinder radius in meters
  open: string;               // Open time (ISO 8601 datetime)
  close: string;              // Close time (ISO 8601 datetime)
  altitude?: number;          // Altitude in meters
  type: 'TAKEOFF' | 'SSS' | 'TURNPOINT' | 'ESS' | 'GOAL';
}

/**
 * A start gate for race tasks
 */
export interface StartGate {
  open: string;               // Gate open time (ISO 8601 datetime)
}

/**
 * Complete task definition
 */
export interface TaskDefinition {
  id: string;
  name: string;
  date: string;               // Task date (ISO 8601 date)
  taskType: TaskType;
  earthModel: EarthModel;
  state: TaskState;

  // Turnpoints
  turnpoints: Turnpoint[];
  ssIndex: number;            // Speed section start index (1-based)
  esIndex: number;            // End of speed section index (1-based)

  // Goal settings
  goalType: GoalType;
  goalAltitude?: number;      // Goal altitude in meters
  goalLine?: [GeoPoint, GeoPoint]; // If goal is LINE

  // Start gates (Race only)
  startGates: StartGate[];

  // Time limits
  maxTimeEnRoute?: number;           // Max time in seconds
  maxTimeEnRouteFromTp?: number;     // TP index to start counting from

  // Calculated distances (in meters)
  taskDistance: number;
  speedSectionDistance: number;
  launchToEssDistance: number;
  legDistances: number[];

  // Shortest route geopoints
  shortestRoute: GeoPoint[];

  // Settings
  qnhSetting: number;                // hPa, default 1013.25
  leadingTimeRatio: number;          // Default 0.26

  // Tracklog folder
  tracklogFolder?: string;
}

/**
 * Task definition as imported from XCTrack
 * (before distance calculations)
 */
export interface XCTaskImport {
  name: string;
  taskType: TaskType;
  earthModel: EarthModel;
  turnpoints: Turnpoint[];
  startGates: StartGate[];
  goalType: GoalType;
  deadline?: string;
}
```

### 1.4 Participant Types

```typescript
// src/main/scoring/types/participant.ts

import type { TaskStatus } from './competition';

/**
 * Competition participant
 */
export interface Participant {
  id: number;
  name: string;
  nation?: string;             // IOC 3-letter code
  female: boolean;
  birthday?: string;           // ISO 8601 date
  glider?: string;
  gliderMainColors?: string;
  sponsor?: string;
  faiLicence?: string;
  civlId?: number;
  customAttributes?: Record<string, string>;
}

/**
 * Task participant with flight data
 */
export interface TaskParticipant {
  participantId: number;
  participant?: Participant;   // Linked reference

  // Flight status
  status: TaskStatus;
  distance: number;            // Meters flown

  // Timing
  startedSS?: string;          // ISO 8601 datetime
  finishedSS?: string;         // ISO 8601 datetime
  finishedTask?: string;       // ISO 8601 datetime
  reachedGoal: boolean;

  // Track info
  tracklogFilename?: string;
  iv0?: number;                // First valid fix index

  // Altitude data
  maxAltitude?: number;
  essAltitude?: number;

  // Penalties
  penalty: number;             // Percentage (0-1)
  penaltyPoints: number;       // Absolute points
  penaltyReason: string;
  penaltyAuto: number;         // Auto penalty percentage
  penaltyPointsAuto: number;   // Auto penalty points
  penaltyReasonAuto: string;

  // Computed
  speed?: number;              // km/h

  // Notes
  note: string;
  warning: string;
}
```

### 1.5 Result Types

```typescript
// src/main/scoring/types/results.ts

import type { Participant, TaskParticipant } from './participant';

/**
 * Task score parameters (calculated before scoring)
 */
export interface TaskScoreParams {
  // Day quality components
  timeValidity: number;
  launchValidity: number;
  distanceValidity: number;
  stopValidity: number;
  dayQuality: number;

  // Weight distribution
  distanceWeight: number;
  timeWeight: number;
  leadingWeight: number;
  arrivalWeight: number;
  departureWeight: number;

  // Available points
  availableDistancePoints: number;
  availableTimePoints: number;
  availableLeadingPoints: number;
  availableArrivalPoints: number;
  availableDeparturePoints: number;

  // Statistics
  pilotsPresent: number;
  pilotsLaunched: number;
  pilotsFlying: number;
  pilotsReachingES: number;
  pilotsReachingGoal: number;

  // Distances
  bestDistance: number;        // Meters
  nominalDistance: number;     // km
  minimumDistance: number;     // km
  sumDistanceOverMin: number;  // For DV calculation

  // Times
  bestTime: number;            // Seconds
  worstTime: number;           // Seconds
  nominalTime: number;         // Hours
  firstStartTime?: string;     // ISO 8601 datetime

  // Leading coefficient
  smallestLeadingCoeff: number;
  leadingCoeffSum: number;
}

/**
 * Individual task result
 */
export interface TaskResult extends TaskParticipant {
  // Points breakdown
  distancePoints: number;
  timePoints: number;
  arrivalPoints: number;
  departurePoints: number;
  leadingPoints: number;

  // Leading coefficient
  leadingCoefficient: number;

  // Total
  totalPoints: number;         // Before penalties
  points: number;              // After penalties
  rank: number;
}

/**
 * Task score within competition results
 */
export interface TaskScore {
  taskId: string;
  taskIndex: number;
  points: number;
  relativeScore: number;       // Percentage of winner
  countingPoints: number;      // After FTV
  counting: boolean;           // Does this task count?
}

/**
 * Competition-wide result
 */
export interface CompetitionResult {
  participantId: number;
  participant?: Participant;

  // Task scores
  taskScores: TaskScore[];

  // Aggregated
  totalPoints: number;
  discardedPoints: number;
  rank: number;
}

/**
 * Competition summary for listing
 */
export interface CompetitionSummary {
  id: string;
  name: string;
  location?: string;
  dateFrom: string;
  dateTo: string;
  taskCount: number;
  participantCount: number;
  filePath?: string;
  updatedAt: string;
}
```

### 1.6 Formula Configuration

```typescript
// src/main/scoring/types/formula.ts

import type { FinalGlideDecelerator, ScoringAltitude } from './competition';

/**
 * Supported formula versions
 */
export type FormulaId = 'GAP2023' | 'GAP2025';

/**
 * Complete scoring formula configuration
 */
export interface ScoringFormulaConfig {
  id: FormulaId;
  isPgComp: boolean;              // Paragliding vs Hang Gliding

  // FAI sanctioning level
  faiSanctioning: number;         // 0, 1, or 2

  // Nominal values
  minDist: number;                // km (default: 7)
  nomDist: number;                // km (default: 70)
  nomGoal: number;                // 0-1 (default: 0.3)
  nomLaunch: number;              // 0-1 (default: 0.96)
  nomTime: number;                // hours (default: 1.5)

  // Point type toggles
  useDistancePoints: boolean;
  useTimePoints: boolean;
  useArrivalPositionPoints: boolean;
  useArrivalTimePoints: boolean;
  useDeparturePoints: boolean;
  useLeadingPoints: boolean;

  // Scoring options
  useDifficultyForDistancePoints: boolean;
  timePointsIfNotInGoal: number;  // 0-1
  jumpTheGunFactor: number;
  jumpTheGunMax: number;          // seconds

  // Day quality
  use1000PointsForMaxDayQuality: boolean;
  normalize1000BeforeDayQuality: boolean;
  dayQualityOverride?: number;    // 0-1

  // Final glide
  finalGlideDecelerator: FinalGlideDecelerator;
  essInclineRatio: number;        // For CESS (default: 3.5)
  aatbFactor: number;             // For AATB (default: 0.45)

  // Goal settings
  useSemiCircleControlZoneForGoalLine: boolean;
  scoringAltitude: ScoringAltitude;

  // Leading coefficient
  leadingWeightFactor: number;
  useConstantLeadingWeight: boolean;
  useFlatDeclineOfTimepoints: boolean;
  useLeadingTimeRatio: boolean;
  useProportionalLeadingWeightIfNobodyInGoal: boolean;

  // Stopped task
  scoreBackTime: number;          // minutes
  minTimeSpanForValidTask: number; // minutes
  minimumValidityToCountStoppedTask: number; // 0-1
  bonusGR: number;                // Glide ratio (default: 2.5 PG, 5 HG)
  bonusForWholeTrack: boolean;

  // Tolerances
  turnpointRadiusTolerance: number;          // 0-1 (default: 0.001)
  turnpointRadiusMinAbsoluteTolerance: number; // meters (default: 5)

  // FTV (Fixed Total Validity)
  ftvFactor: number;              // 0-1, discard factor
  useBestScoreForFtvValidity: boolean;

  // Result formatting
  numberOfDecimalsTaskResults: number;
  numberOfDecimalsCompetitionResults: number;

  // Misc
  redistributeRemovedTimePointsAsDistancePoints: boolean;
  optimizeSsAlone: boolean;
}

/**
 * GAP2023 Paragliding defaults
 */
export const GAP2023_PG_DEFAULTS: ScoringFormulaConfig = {
  id: 'GAP2023',
  isPgComp: true,
  faiSanctioning: 0,
  minDist: 7,
  nomDist: 70,
  nomGoal: 0.3,
  nomLaunch: 0.96,
  nomTime: 1.5,
  useDistancePoints: true,
  useTimePoints: true,
  useArrivalPositionPoints: false,
  useArrivalTimePoints: false,
  useDeparturePoints: false,
  useLeadingPoints: true,
  useDifficultyForDistancePoints: false,
  timePointsIfNotInGoal: 0,
  jumpTheGunFactor: 0,
  jumpTheGunMax: 0,
  use1000PointsForMaxDayQuality: false,
  normalize1000BeforeDayQuality: false,
  finalGlideDecelerator: 'none',
  essInclineRatio: 3.5,
  aatbFactor: 0.45,
  useSemiCircleControlZoneForGoalLine: true,
  scoringAltitude: 'GPS',
  leadingWeightFactor: 1.0,
  useConstantLeadingWeight: false,
  useFlatDeclineOfTimepoints: true,
  useLeadingTimeRatio: true,
  useProportionalLeadingWeightIfNobodyInGoal: false,
  scoreBackTime: 5,
  minTimeSpanForValidTask: 0,
  minimumValidityToCountStoppedTask: 0.05,
  bonusGR: 2.5,
  bonusForWholeTrack: false,
  turnpointRadiusTolerance: 0.001,
  turnpointRadiusMinAbsoluteTolerance: 5,
  ftvFactor: 0,
  useBestScoreForFtvValidity: true,
  numberOfDecimalsTaskResults: 1,
  numberOfDecimalsCompetitionResults: 1,
  redistributeRemovedTimePointsAsDistancePoints: true,
  optimizeSsAlone: false,
};

/**
 * GAP2025 Paragliding defaults
 * (based on GAP2023 with updates)
 */
export const GAP2025_PG_DEFAULTS: ScoringFormulaConfig = {
  ...GAP2023_PG_DEFAULTS,
  id: 'GAP2025',
  useConstantLeadingWeight: true,
};
```

### 1.7 Index Export

```typescript
// src/main/scoring/types/index.ts

// Re-export all types
export * from './competition';
export * from './geo';
export * from './task';
export * from './participant';
export * from './results';
export * from './formula';
```

---

## Step 2: Storage Layer

### 2.1 Storage Interface

```typescript
// src/main/scoring/storage/competitionStorage.ts

import type {
  Competition,
  CompetitionSummary,
  TaskDefinition,
  TaskResult,
  CompetitionResult,
  Participant,
  ScoringFormulaConfig
} from '../types';

/**
 * Competition creation data
 */
export interface CreateCompetitionData {
  name: string;
  location?: string;
  dateFrom: string;
  dateTo: string;
  discipline: 'PG' | 'HG';
  scoringFormula?: Partial<ScoringFormulaConfig>;
}

/**
 * Competition storage interface
 */
export interface ICompetitionStorage {
  // Competition CRUD
  createCompetition(data: CreateCompetitionData): Promise<string>;
  getCompetition(id: string): Promise<Competition | null>;
  updateCompetition(id: string, updates: Partial<Competition>): Promise<void>;
  deleteCompetition(id: string): Promise<void>;
  listCompetitions(): Promise<CompetitionSummary[]>;

  // Tasks
  addTask(compId: string, task: TaskDefinition): Promise<void>;
  getTask(compId: string, taskId: string): Promise<TaskDefinition | null>;
  updateTask(compId: string, taskId: string, updates: Partial<TaskDefinition>): Promise<void>;
  deleteTask(compId: string, taskId: string): Promise<void>;
  getTasks(compId: string): Promise<TaskDefinition[]>;

  // Participants
  addParticipant(compId: string, participant: Participant): Promise<void>;
  getParticipant(compId: string, participantId: number): Promise<Participant | null>;
  updateParticipant(compId: string, participantId: number, updates: Partial<Participant>): Promise<void>;
  deleteParticipant(compId: string, participantId: number): Promise<void>;
  getParticipants(compId: string): Promise<Participant[]>;

  // Results
  saveTaskResults(compId: string, taskId: string, results: TaskResult[]): Promise<void>;
  getTaskResults(compId: string, taskId: string): Promise<TaskResult[]>;
  saveCompetitionResults(compId: string, results: CompetitionResult[]): Promise<void>;
  getCompetitionResults(compId: string): Promise<CompetitionResult[]>;

  // Formula
  getScoringFormula(compId: string): Promise<ScoringFormulaConfig>;
  updateScoringFormula(compId: string, formula: Partial<ScoringFormulaConfig>): Promise<void>;

  // File operations
  loadFromFile(filePath: string): Promise<Competition>;
  saveToFile(compId: string, filePath: string): Promise<void>;
}
```

### 2.2 File-Based Implementation

```typescript
// src/main/scoring/storage/fileStorage.ts

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import type {
  Competition,
  CompetitionSummary,
  TaskDefinition,
  TaskResult,
  CompetitionResult,
  Participant,
  ScoringFormulaConfig
} from '../types';
import { GAP2023_PG_DEFAULTS } from '../types/formula';
import type { ICompetitionStorage, CreateCompetitionData } from './competitionStorage';

/**
 * File-based competition storage
 *
 * Directory structure:
 * ~/trackdownloader/competitions/
 *   {competition-id}/
 *     competition.json    # Competition metadata
 *     formula.json        # Scoring formula
 *     participants.json   # Participant list
 *     tasks/
 *       {task-id}.json    # Task definition
 *     results/
 *       {task-id}.json    # Task results
 *     overall-results.json
 */
export class FileStorage implements ICompetitionStorage {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(app.getPath('userData'), 'competitions');
    this.ensureDirectory(this.baseDir);
  }

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private getCompDir(compId: string): string {
    return path.join(this.baseDir, compId);
  }

  // Competition CRUD
  async createCompetition(data: CreateCompetitionData): Promise<string> {
    const id = uuidv4();
    const compDir = this.getCompDir(id);

    this.ensureDirectory(compDir);
    this.ensureDirectory(path.join(compDir, 'tasks'));
    this.ensureDirectory(path.join(compDir, 'results'));

    const now = new Date().toISOString();
    const competition: Competition = {
      id,
      name: data.name,
      location: data.location,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      discipline: data.discipline,
      createdAt: now,
      updatedAt: now,
    };

    // Save competition metadata
    fs.writeFileSync(
      path.join(compDir, 'competition.json'),
      JSON.stringify(competition, null, 2)
    );

    // Save formula (use defaults if not provided)
    const formula: ScoringFormulaConfig = {
      ...GAP2023_PG_DEFAULTS,
      isPgComp: data.discipline === 'PG',
      ...data.scoringFormula,
    };
    fs.writeFileSync(
      path.join(compDir, 'formula.json'),
      JSON.stringify(formula, null, 2)
    );

    // Initialize empty participants
    fs.writeFileSync(
      path.join(compDir, 'participants.json'),
      '[]'
    );

    return id;
  }

  async getCompetition(id: string): Promise<Competition | null> {
    const compFile = path.join(this.getCompDir(id), 'competition.json');
    if (!fs.existsSync(compFile)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(compFile, 'utf-8'));
  }

  async updateCompetition(id: string, updates: Partial<Competition>): Promise<void> {
    const comp = await this.getCompetition(id);
    if (!comp) throw new Error(`Competition ${id} not found`);

    const updated = {
      ...comp,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(this.getCompDir(id), 'competition.json'),
      JSON.stringify(updated, null, 2)
    );
  }

  async deleteCompetition(id: string): Promise<void> {
    const compDir = this.getCompDir(id);
    if (fs.existsSync(compDir)) {
      fs.rmSync(compDir, { recursive: true });
    }
  }

  async listCompetitions(): Promise<CompetitionSummary[]> {
    const dirs = fs.readdirSync(this.baseDir);
    const summaries: CompetitionSummary[] = [];

    for (const dir of dirs) {
      const compFile = path.join(this.baseDir, dir, 'competition.json');
      if (fs.existsSync(compFile)) {
        const comp = JSON.parse(fs.readFileSync(compFile, 'utf-8'));
        const tasks = await this.getTasks(dir);
        const participants = await this.getParticipants(dir);

        summaries.push({
          id: comp.id,
          name: comp.name,
          location: comp.location,
          dateFrom: comp.dateFrom,
          dateTo: comp.dateTo,
          taskCount: tasks.length,
          participantCount: participants.length,
          filePath: path.join(this.baseDir, dir),
          updatedAt: comp.updatedAt,
        });
      }
    }

    return summaries.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // Tasks
  async addTask(compId: string, task: TaskDefinition): Promise<void> {
    const taskFile = path.join(this.getCompDir(compId), 'tasks', `${task.id}.json`);
    fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));
    await this.updateCompetition(compId, {}); // Update timestamp
  }

  async getTask(compId: string, taskId: string): Promise<TaskDefinition | null> {
    const taskFile = path.join(this.getCompDir(compId), 'tasks', `${taskId}.json`);
    if (!fs.existsSync(taskFile)) return null;
    return JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
  }

  async updateTask(compId: string, taskId: string, updates: Partial<TaskDefinition>): Promise<void> {
    const task = await this.getTask(compId, taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const updated = { ...task, ...updates };
    const taskFile = path.join(this.getCompDir(compId), 'tasks', `${taskId}.json`);
    fs.writeFileSync(taskFile, JSON.stringify(updated, null, 2));
    await this.updateCompetition(compId, {});
  }

  async deleteTask(compId: string, taskId: string): Promise<void> {
    const taskFile = path.join(this.getCompDir(compId), 'tasks', `${taskId}.json`);
    if (fs.existsSync(taskFile)) {
      fs.unlinkSync(taskFile);
    }
    // Also delete results
    const resultsFile = path.join(this.getCompDir(compId), 'results', `${taskId}.json`);
    if (fs.existsSync(resultsFile)) {
      fs.unlinkSync(resultsFile);
    }
    await this.updateCompetition(compId, {});
  }

  async getTasks(compId: string): Promise<TaskDefinition[]> {
    const tasksDir = path.join(this.getCompDir(compId), 'tasks');
    if (!fs.existsSync(tasksDir)) return [];

    const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
    return files.map(f =>
      JSON.parse(fs.readFileSync(path.join(tasksDir, f), 'utf-8'))
    );
  }

  // ... (continue with participants, results, and formula methods)
}
```

---

## Step 3: React Context

See [IPC Channels](../architecture/ipc-channels.md) for IPC implementation details.

```typescript
// src/renderer/context/competitionContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Competition,
  CompetitionSummary,
  TaskDefinition,
  TaskResult,
  CompetitionResult,
  Participant,
  ScoringFormulaConfig,
} from '../../main/scoring/types';

interface CompetitionState {
  // Active competition
  competition: Competition | null;

  // Tasks
  tasks: TaskDefinition[];
  activeTaskId: string | null;

  // Participants
  participants: Participant[];

  // Results
  taskResults: Record<string, TaskResult[]>;
  competitionResults: CompetitionResult[] | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  scoringProgress: {
    visible: boolean;
    percent: number;
    detail: string;
  };

  // Recent competitions
  recentCompetitions: CompetitionSummary[];
}

interface CompetitionContextValue {
  state: CompetitionState;

  // Competition management
  createCompetition: (data: CreateCompetitionData) => Promise<string>;
  loadCompetition: (id: string) => Promise<void>;
  updateCompetition: (updates: Partial<Competition>) => Promise<void>;
  closeCompetition: () => void;
  refreshRecentCompetitions: () => Promise<void>;

  // Task management
  importTask: () => Promise<TaskDefinition | null>;
  addTask: (task: TaskDefinition) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<TaskDefinition>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setActiveTask: (taskId: string | null) => void;

  // Participant management
  addParticipant: (participant: Participant) => Promise<void>;
  updateParticipant: (id: number, updates: Partial<Participant>) => Promise<void>;
  deleteParticipant: (id: number) => Promise<void>;
  importParticipantsFromPilots: () => void;

  // Scoring
  scoreTask: (taskId: string) => Promise<TaskResult[]>;
  scoreCompetition: () => Promise<CompetitionResult[]>;

  // Clear error
  clearError: () => void;
}

const initialState: CompetitionState = {
  competition: null,
  tasks: [],
  activeTaskId: null,
  participants: [],
  taskResults: {},
  competitionResults: null,
  isLoading: false,
  error: null,
  scoringProgress: {
    visible: false,
    percent: 0,
    detail: '',
  },
  recentCompetitions: [],
};

const CompetitionContext = createContext<CompetitionContextValue | null>(null);

export const useCompetition = () => {
  const context = useContext(CompetitionContext);
  if (!context) {
    throw new Error('useCompetition must be used within CompetitionProvider');
  }
  return context;
};

export const CompetitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CompetitionState>(() => {
    // Try to restore from localStorage
    const stored = localStorage.getItem('competition-state');
    if (stored) {
      try {
        return { ...initialState, ...JSON.parse(stored) };
      } catch {
        return initialState;
      }
    }
    return initialState;
  });

  // Persist to localStorage
  useEffect(() => {
    const { competition, activeTaskId, recentCompetitions } = state;
    localStorage.setItem('competition-state', JSON.stringify({
      competition: competition ? { id: competition.id } : null,
      activeTaskId,
      recentCompetitions,
    }));
  }, [state.competition, state.activeTaskId, state.recentCompetitions]);

  // Listen for scoring progress
  useEffect(() => {
    window.scoring.onScoringProgress((data) => {
      setState(prev => ({
        ...prev,
        scoringProgress: {
          visible: true,
          percent: data.percent,
          detail: data.detail,
        },
      }));
    });

    return () => {
      window.scoring.removeScoringProgressListener();
    };
  }, []);

  // Implementation of context methods...
  // (See full implementation in IPC channels documentation)

  const value: CompetitionContextValue = {
    state,
    // ... methods
  };

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};
```

---

## Validation Checklist

- [ ] All TypeScript interfaces compile without errors
- [ ] Storage creates proper directory structure
- [ ] IPC handlers respond correctly
- [ ] Context persists state to localStorage
- [ ] Error handling works for missing files/data

## Next Phase

[Phase 2: Task Import](./phase-2-task-import.md) - Implement XCTrack .xctsk parsing
