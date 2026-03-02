/**
 * Task definition types
 */

import type { GeoPoint } from "./geo";
import type {
  TaskType,
  EarthModel,
  TaskState,
  GoalType,
  TurnpointType,
} from "./competition";

/**
 * Turnpoint in a task
 */
export interface Turnpoint {
  id: string;
  geopoint: GeoPoint;
  radius: number; // meters
  open: string; // ISO datetime
  close: string; // ISO datetime
  altitude: number; // meters
  type: TurnpointType;
}

/**
 * Start gate timing
 */
export interface StartGate {
  open: string; // ISO datetime
  close?: string; // ISO datetime (optional)
}

/**
 * Complete task definition
 */
export interface TaskDefinition {
  id: string;
  name: string;
  date: string; // ISO date
  taskType: TaskType;
  earthModel: EarthModel;
  state: TaskState;

  // Turnpoints
  turnpoints: Turnpoint[];
  ssIndex: number; // 1-based index of SS
  esIndex: number; // 1-based index of ES

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
  qnhSetting: number; // hPa (default 1013.25)
  leadingTimeRatio: number; // default 0.26

  // Scoring metadata
  scoredAt?: string;
}

/**
 * Task data imported from XCTrack before distance calculations
 */
export interface XCTaskImport {
  name: string;
  taskType: TaskType;
  earthModel: EarthModel;
  turnpoints: Turnpoint[];
  ssIndex: number;
  esIndex: number;
  goalType: GoalType;
  startGates: StartGate[];
  qnhSetting?: number;
}
