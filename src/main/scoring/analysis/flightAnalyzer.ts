/**
 * Flight analyzer coordinator
 *
 * Main entry point for analyzing IGC tracks against task definitions.
 * Coordinates turnpoint detection, distance calculation, and time-distance graph generation.
 */

import * as fs from "fs";
import IGCParser from "../../lib/igc-parser";
import type { TaskDefinition } from "../types/task";
import type {
  FlightAnalysis,
  FlightFix,
  FlightAnalysisOptions,
} from "../types/flightAnalysis";
import { findAllCrossings, getValidCrossings } from "./turnpointDetector";
import { calculateFlownDistance } from "./distanceCalculator";
import { generateTimeDistanceGraph } from "./timeDistanceGraph";

/**
 * Default analysis options
 */
const DEFAULT_OPTIONS: FlightAnalysisOptions = {
  radiusTolerance: 0.001,
  minAbsTolerance: 5,
  minDistance: 7000,
};

/**
 * Analyze a flight track against a task definition
 *
 * @param igcPath Path to IGC file
 * @param task Task definition to analyze against
 * @param pilotId Pilot identifier
 * @param options Analysis options
 * @returns Complete flight analysis result
 */
export async function analyzeFlightForTask(
  igcPath: string,
  task: TaskDefinition,
  pilotId: number,
  options?: Partial<FlightAnalysisOptions>
): Promise<FlightAnalysis> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Read and parse IGC file
  const content = fs.readFileSync(igcPath, "utf-8");
  const igc = IGCParser.parse(content, { lenient: true });

  // Convert to FlightFix array
  const fixes: FlightFix[] = igc.fixes.map((f) => ({
    timestamp: f.timestamp,
    time: f.time,
    latitude: f.latitude,
    longitude: f.longitude,
    gpsAltitude: f.gpsAltitude,
    pressureAltitude: f.pressureAltitude,
    valid: f.valid,
  }));

  return analyzeFlightFixes(fixes, task, pilotId, igcPath, opts);
}

/**
 * Analyze flight fixes directly (without file I/O)
 *
 * @param fixes Flight fixes array
 * @param task Task definition
 * @param pilotId Pilot identifier
 * @param igcFilename Original filename (for reference)
 * @param options Analysis options
 * @returns Complete flight analysis result
 */
export function analyzeFlightFixes(
  fixes: FlightFix[],
  task: TaskDefinition,
  pilotId: number,
  igcFilename: string,
  options?: Partial<FlightAnalysisOptions>
): FlightAnalysis {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const validationErrors: string[] = [];

  // Validate input
  if (fixes.length === 0) {
    validationErrors.push("No fixes in IGC file");
    return createEmptyAnalysis(pilotId, igcFilename, validationErrors);
  }

  if (task.turnpoints.length < 2) {
    validationErrors.push("Task must have at least 2 turnpoints");
    return createEmptyAnalysis(pilotId, igcFilename, validationErrors);
  }

  // Find all turnpoint crossings
  const crossings = findAllCrossings(
    fixes,
    task.turnpoints,
    opts.radiusTolerance,
    opts.minAbsTolerance
  );

  // Get valid crossings in sequence
  const validCrossings = getValidCrossings(crossings, task.turnpoints);

  // Calculate distance flown
  const distResult = calculateFlownDistance(
    fixes,
    task,
    validCrossings,
    opts.minDistance
  );

  // Generate time-distance graph for leading coefficient
  const timeDistanceGraph = generateTimeDistanceGraph(
    fixes,
    task,
    validCrossings
  );

  // Extract key crossings
  const ssIdx = task.ssIndex - 1;
  const esIdx = task.esIndex - 1;
  const goalIdx = task.turnpoints.length - 1;

  const ssCrossing = validCrossings[ssIdx];
  const esCrossing = validCrossings[esIdx];
  const goalCrossing = validCrossings[goalIdx];

  // Calculate max altitude
  const maxAltitude = Math.max(
    ...fixes.map((f) => f.gpsAltitude ?? f.pressureAltitude ?? 0)
  );

  // Get ESS altitude
  const essAltitude = esCrossing
    ? (fixes[esCrossing.toFixIndex]?.pressureAltitude ??
      fixes[esCrossing.toFixIndex]?.gpsAltitude ??
      undefined)
    : undefined;

  return {
    pilotId,
    igcFilename,
    fixes,
    crossings,
    validCrossings,
    takeoffTime: fixes[0]?.timestamp,
    startTime: ssCrossing?.timestamp,
    essTime: esCrossing?.timestamp,
    goalTime: goalCrossing?.timestamp,
    landingTime: fixes[fixes.length - 1]?.timestamp,
    distanceFlown: distResult.distanceFlown,
    realDistance: distResult.realDistance,
    bonusDistance: distResult.bonusDistance,
    maxAltitude,
    essAltitude,
    timeDistanceGraph,
    reachedGoal: goalCrossing !== null,
    isValid: validationErrors.length === 0,
    validationErrors,
  };
}

/**
 * Parse IGC content and return flight fixes
 *
 * @param content IGC file content
 * @returns Array of flight fixes
 */
export function parseIgcContent(content: string): FlightFix[] {
  const igc = IGCParser.parse(content, { lenient: true });

  return igc.fixes.map((f) => ({
    timestamp: f.timestamp,
    time: f.time,
    latitude: f.latitude,
    longitude: f.longitude,
    gpsAltitude: f.gpsAltitude,
    pressureAltitude: f.pressureAltitude,
    valid: f.valid,
  }));
}

/**
 * Read and parse IGC file
 *
 * @param igcPath Path to IGC file
 * @returns Array of flight fixes
 */
export async function readIgcFile(igcPath: string): Promise<FlightFix[]> {
  const content = fs.readFileSync(igcPath, "utf-8");
  return parseIgcContent(content);
}

/**
 * Create an empty analysis result for error cases
 */
function createEmptyAnalysis(
  pilotId: number,
  igcFilename: string,
  validationErrors: string[]
): FlightAnalysis {
  return {
    pilotId,
    igcFilename,
    fixes: [],
    crossings: [],
    validCrossings: [],
    distanceFlown: 0,
    realDistance: 0,
    bonusDistance: 0,
    maxAltitude: 0,
    timeDistanceGraph: [],
    reachedGoal: false,
    isValid: false,
    validationErrors,
  };
}
