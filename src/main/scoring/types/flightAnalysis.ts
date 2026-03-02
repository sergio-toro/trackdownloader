/**
 * Flight analysis types for IGC track processing
 */

import type { GeoPoint } from "./geo";

/**
 * Individual GPS fix from IGC file
 */
export interface FlightFix {
  timestamp: number; // Unix ms
  time: string; // HH:MM:SS
  latitude: number;
  longitude: number;
  gpsAltitude: number | null;
  pressureAltitude: number | null;
  valid: boolean;
}

/**
 * Turnpoint cylinder crossing event
 */
export interface TurnpointCrossing {
  turnpointIndex: number;
  time: Date;
  timestamp: number; // Unix ms
  fromFixIndex: number;
  toFixIndex: number;
  crossingPoint: GeoPoint;
  isEnter: boolean; // true = entering cylinder, false = exiting
  distanceToCenter: number; // meters
}

/**
 * Time-distance point for leading coefficient calculation
 */
export interface TimeDist {
  dist: number; // Distance flown in speed section (meters)
  dist2es: number; // Distance remaining to ESS (meters)
  time: number; // Time since SS start (seconds)
  alt: number; // Altitude (meters)
}

/**
 * Distance calculation result
 */
export interface DistanceResult {
  distanceFlown: number; // meters (floored to minimum)
  realDistance: number; // meters (actual best distance)
  bonusDistance: number; // meters (altitude bonus for stopped tasks)
  lastCountingFix: FlightFix;
  lastTurnpointReached: number; // index
}

/**
 * Complete flight analysis result
 */
export interface FlightAnalysis {
  // Source identification
  pilotId: number;
  igcFilename: string;

  // Parsed track
  fixes: FlightFix[];

  // Turnpoint crossings (all detected, per turnpoint)
  crossings: TurnpointCrossing[][];

  // Valid crossings (first valid per turnpoint, in sequence)
  validCrossings: (TurnpointCrossing | null)[];

  // Key timestamps (Unix ms)
  takeoffTime?: number;
  startTime?: number; // SS crossing
  essTime?: number; // ES crossing
  goalTime?: number;
  landingTime?: number;

  // Distances (meters)
  distanceFlown: number; // floored distance
  realDistance: number; // actual distance (before flooring)
  bonusDistance: number; // altitude bonus for stopped tasks

  // Altitude data (meters)
  maxAltitude: number;
  essAltitude?: number;

  // Time-distance graph for leading coefficient
  timeDistanceGraph: TimeDist[];

  // Status
  reachedGoal: boolean;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Options for flight analysis
 */
export interface FlightAnalysisOptions {
  // Radius tolerance as fraction (default 0.001 = 0.1%)
  radiusTolerance?: number;
  // Minimum absolute radius tolerance in meters (default 5)
  minAbsTolerance?: number;
  // Minimum distance floor in meters (default 7000 = 7km)
  minDistance?: number;
}
