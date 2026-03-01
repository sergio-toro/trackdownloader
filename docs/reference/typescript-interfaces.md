# TypeScript Interfaces Reference

Complete interface definitions for the competition classification system.

## Core Types

### Competition

```typescript
export interface Competition {
  id: string;
  name: string;
  location: string;
  startDate: string;          // ISO date
  endDate: string;            // ISO date
  timeZone: string;           // IANA timezone
  formula: ScoringFormulaConfig;
  participants: Participant[];
  tasks: TaskDefinition[];
  createdAt: string;
  updatedAt: string;
}

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
```

### Participant

```typescript
export interface Participant {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  nation?: string;           // ISO 3166-1 alpha-3
  civlId?: number;
  faiId?: string;
  glider?: string;
  gliderClass?: string;
  sponsor?: string;
  status: ParticipantStatus;
  taskTracks?: TaskTrack[];
}

export type ParticipantStatus =
  | 'Confirmed'
  | 'Waiting'
  | 'Cancelled'
  | 'Withdrawn';

export interface TaskTrack {
  taskId: string;
  igcPath: string;
  uploadedAt: string;
}
```

### Task Definition

```typescript
export interface TaskDefinition {
  id: string;
  name: string;
  date: string;              // ISO date
  taskType: TaskType;
  earthModel: EarthModel;
  state: TaskState;

  // Turnpoints
  turnpoints: Turnpoint[];
  ssIndex: number;           // 1-based index of SS
  esIndex: number;           // 1-based index of ES

  // Goal
  goalType: GoalType;

  // Start
  startGates: StartGate[];

  // Distances (meters)
  taskDistance: number;
  speedSectionDistance: number;
  launchToEssDistance: number;
  legDistances: number[];

  // Route
  shortestRoute: GeoPoint[];

  // Settings
  qnhSetting: number;        // hPa
  leadingTimeRatio: number;

  // Scoring metadata
  scoredAt?: string;
}

export type TaskType = 'Race' | 'TimeTrial' | 'OpenDistance';
export type EarthModel = 'WGS84' | 'FAI_SPHERE';
export type TaskState = 'Regular' | 'Stopped' | 'Cancelled';
export type GoalType = 'CYLINDER' | 'LINE';
```

### Turnpoint

```typescript
export interface Turnpoint {
  id: string;
  geopoint: GeoPoint;
  radius: number;            // meters
  open: string;              // ISO datetime
  close: string;             // ISO datetime
  altitude: number;          // meters
  type: TurnpointType;
}

export type TurnpointType =
  | 'TAKEOFF'
  | 'SSS'
  | 'TURNPOINT'
  | 'ESS'
  | 'GOAL';

export interface StartGate {
  open: string;              // ISO datetime
  close?: string;            // ISO datetime
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  name?: string;
}
```

---

## Flight Analysis Types

### FlightFix

```typescript
export interface FlightFix {
  timestamp: number;          // Unix ms
  time: string;               // HH:MM:SS
  latitude: number;
  longitude: number;
  gpsAltitude: number | null;
  pressureAltitude: number | null;
  valid: boolean;
}
```

### TurnpointCrossing

```typescript
export interface TurnpointCrossing {
  turnpointIndex: number;
  time: Date;
  timestamp: number;          // Unix ms
  fromFixIndex: number;
  toFixIndex: number;
  crossingPoint: GeoPoint;
  isEnter: boolean;
  distanceToCenter: number;   // meters
}
```

### FlightAnalysis

```typescript
export interface FlightAnalysis {
  // Source
  pilotId: number;
  igcFilename: string;

  // Parsed track
  fixes: FlightFix[];

  // Turnpoint crossings
  crossings: TurnpointCrossing[][];  // Per turnpoint
  validCrossings: (TurnpointCrossing | null)[];

  // Key times (Unix ms)
  takeoffTime?: number;
  startTime?: number;           // SS crossing
  essTime?: number;             // ES crossing
  goalTime?: number;
  landingTime?: number;

  // Distances (meters)
  distanceFlown: number;        // Floored
  realDistance: number;         // Unfloor'd
  bonusDistance: number;        // For stopped tasks

  // Altitude (meters)
  maxAltitude: number;
  essAltitude?: number;

  // Time-distance graph for LC
  timeDistanceGraph: TimeDist[];

  // Status
  reachedGoal: boolean;
  isValid: boolean;
  validationErrors: string[];

  // Penalties
  penalties?: Penalty[];
}

export interface TimeDist {
  dist: number;      // Distance flown in SS (meters)
  dist2es: number;   // Distance remaining to ESS (meters)
  time: number;      // Time since SS start (seconds)
  alt: number;       // Altitude (meters)
}

export interface Penalty {
  type: PenaltyType;
  points: number;
  reason: string;
  appliedAt?: string;
}

export type PenaltyType =
  | 'JumpTheGun'
  | 'AirspaceViolation'
  | 'Administrative'
  | 'Other';
```

---

## Scoring Formula Types

### ScoringFormulaConfig

```typescript
export interface ScoringFormulaConfig {
  name: string;                   // 'GAP2023' | 'GAP2025'

  // Nominal values
  nominalDistance: number;        // meters (default: 50000)
  nominalTime: number;            // seconds (default: 5400)
  nominalGoal: number;            // 0-1 (default: 0.2)
  nominalLaunch: number;          // 0-1 (default: 0.96)

  // Minimum distance
  minimumDistance: number;        // meters (default: 7000)

  // Point categories
  useLeadingPoints: boolean;
  useArrivalPoints: boolean;
  useDeparturePoints: boolean;

  // Fractions
  leadingFraction: number;        // 0-1 (default: 0.26)
  arrivalFraction: number;        // 0-1 (default: 0)
  departureFraction: number;      // 0-1 (default: 0)

  // Leading calculator
  leadingCalculatorType: LeadingCalculatorType;
  leadingWeightFactor: number;    // 0-2 (default: 1.0)

  // Time points
  useFlatDecline: boolean;        // true = 5/6 exponent, false = 2/3

  // Stopped task
  altitudeBonusFactor: number;    // 0-0.1 (default: 0)

  // FTV
  ftvFactor: number;              // 0-1 (default: 0)

  // Task-specific overrides
  taskDistance?: number;
  speedSectionDistance?: number;
  essAltitude?: number;
}

export type LeadingCalculatorType = 'Classic' | 'PWC2019' | 'PWC2023';
```

---

## Scoring Result Types

### TaskStatistics

```typescript
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
  sumOfFlownDistancesOverMin: number;
  maxDistanceOverMin: number;
  minDistance: number;

  // Time stats
  bestTime: number;           // seconds
  bestFinishTime: number;     // timestamp
  lastFinishTime: number;     // timestamp

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
```

### PointWeights & AvailablePoints

```typescript
export interface PointWeights {
  distanceWeight: number;     // 0-1
  timeWeight: number;         // 0-1
  arrivalWeight: number;      // 0-1
  leadingWeight: number;      // 0-1
  departureWeight: number;    // 0-1
}

export interface AvailablePoints {
  totalAvailable: number;     // Max ~1000
  distanceAvailable: number;
  timeAvailable: number;
  arrivalAvailable: number;
  leadingAvailable: number;
  departureAvailable: number;
}
```

### TaskResult

```typescript
export interface TaskResult {
  taskId: string;
  taskName: string;
  taskDate: string;
  scoredAt: string;
  formula: string;

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

export interface PilotResult {
  pilotId: number;
  rank: number;

  // Flight data
  distance: number;           // meters
  time: number | null;        // seconds (null if no goal)
  reachedGoal: boolean;
  reachedESS: boolean;

  // Point breakdown
  distancePoints: number;
  timePoints: number;
  arrivalPoints: number;
  leadingPoints: number;
  departurePoints: number;

  // Penalties
  penalties: Penalty[];
  penaltyPoints: number;

  // Total
  totalPoints: number;
}
```

### CompetitionStanding

```typescript
export interface CompetitionStanding {
  participantId: number;
  rank: number;
  totalPoints: number;
  taskPoints: Record<string, number>;  // taskId -> points
  discardedTasks: string[];            // taskIds not counting
  tasksFlown: number;
}

export interface CompetitionResult {
  competitionId: string;
  scoredAt: string;
  taskCount: number;
  scoredTaskCount: number;
  standings: CompetitionStanding[];
}
```

---

## IPC Types

### IPC Method Signatures

```typescript
export interface ScoringMethods {
  // Competition management
  listCompetitions: () => Promise<CompetitionSummary[]>;
  getCompetition: (id: string) => Promise<Competition>;
  createCompetition: (data: CreateCompetitionData) => Promise<string>;
  updateCompetition: (id: string, data: Partial<Competition>) => Promise<void>;
  deleteCompetition: (id: string) => Promise<void>;

  // Task management
  importXctsk: (path: string) => Promise<TaskDefinition>;
  addTask: (compId: string, task: TaskDefinition) => Promise<void>;
  updateTask: (compId: string, taskId: string, data: Partial<TaskDefinition>) => Promise<void>;
  deleteTask: (compId: string, taskId: string) => Promise<void>;

  // Participant management
  addParticipant: (compId: string, data: Participant) => Promise<void>;
  updateParticipant: (compId: string, participant: Participant) => Promise<void>;
  removeParticipant: (compId: string, participantId: number) => Promise<void>;
  importParticipants: (compId: string, csvPath: string) => Promise<number>;

  // Track management
  linkTrack: (compId: string, participantId: number, taskId: string, igcPath: string) => Promise<void>;
  unlinkTrack: (compId: string, participantId: number, taskId: string) => Promise<void>;

  // Analysis
  analyzeFlights: (compId: string, taskId: string) => Promise<FlightAnalysis[]>;

  // Scoring
  scoreTask: (compId: string, taskId: string) => Promise<TaskResult>;
  getTaskResult: (compId: string, taskId: string) => Promise<TaskResult | null>;

  // Competition results
  scoreCompetition: (compId: string) => Promise<CompetitionResult>;
  getCompetitionResults: (compId: string) => Promise<CompetitionResult | null>;

  // Export
  exportResults: (compId: string, options: ExportOptions) => Promise<string[]>;

  // File dialogs
  selectFile: (type: 'xctsk' | 'igc' | 'csv') => Promise<string>;
  selectDirectory: () => Promise<string>;
}

export interface CreateCompetitionData {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  timeZone?: string;
  formulaName?: string;
}

export interface ExportOptions {
  format: 'csv' | 'html' | 'fsdb' | 'json';
  includeTaskResults: boolean;
  includeStandings: boolean;
}
```

---

## Utility Types

### Coordinate

```typescript
export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Coordinate3D extends Coordinate {
  altitude: number;
}
```

### Distance Result

```typescript
export interface DistanceResult {
  distanceFlown: number;
  realDistance: number;
  bonusDistance: number;
  lastCountingFix: FlightFix;
  lastTurnpointReached: number;
}
```

### Leading Calculator Result

```typescript
export interface LeadingCalculatorResult {
  leadingCoeff: number;
  areaBeforeBest: number;
  areaAfterBest: number;
  totalArea: number;
}
```

---

## Type Guards

```typescript
export function isValidTurnpointType(type: string): type is TurnpointType {
  return ['TAKEOFF', 'SSS', 'TURNPOINT', 'ESS', 'GOAL'].includes(type);
}

export function isValidTaskType(type: string): type is TaskType {
  return ['Race', 'TimeTrial', 'OpenDistance'].includes(type);
}

export function isValidParticipantStatus(status: string): status is ParticipantStatus {
  return ['Confirmed', 'Waiting', 'Cancelled', 'Withdrawn'].includes(status);
}

export function hasReachedGoal(analysis: FlightAnalysis): boolean {
  return analysis.reachedGoal && analysis.goalTime !== undefined;
}

export function hasReachedESS(analysis: FlightAnalysis): boolean {
  return analysis.essTime !== undefined;
}
```
