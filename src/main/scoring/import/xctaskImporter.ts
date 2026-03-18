/**
 * XCTrack .xctsk file importer
 *
 * Parses XCTrack v1 JSON task files and converts them to TaskDefinition
 */

import fs from "fs/promises";
import path from "path";
import { toSlug } from "../utils/slug";

import type {
  TaskDefinition,
  Turnpoint,
  StartGate,
  XCTaskImport,
} from "../types/task";
import type {
  TaskType,
  EarthModel,
  GoalType,
  TurnpointType,
} from "../types/competition";
import type { GeoPoint } from "../types/geo";
import { calculateTaskDistances } from "../geo/shortestRoute";

/**
 * XCTrack turnpoint JSON structure
 */
interface XCTurnpoint {
  type?: "TAKEOFF" | "SSS" | "TURNPOINT" | "ESS" | "GOAL";
  radius: number | string;
  waypoint: {
    name: string;
    description?: string;
    lat: number | string;
    lon: number | string;
    altSmoothed: number | string;
  };
}

/**
 * XCTrack SSS (start) configuration
 */
interface XCStartConfig {
  type: "RACE" | "ELAPSED_TIME";
  direction: "ENTER" | "EXIT";
  timeGates: string[];
}

/**
 * XCTrack goal configuration
 */
interface XCGoalConfig {
  type: "CYLINDER" | "LINE";
  deadline: string;
}

/**
 * Optional competition metadata
 */
interface XCCompetitionInfo {
  name?: string;
  location?: string;
  date?: string;
}

/**
 * Complete XCTrack task file structure
 */
interface XCTask {
  taskType: "CLASSIC" | "RACE" | "ELAPSED_TIME";
  version: number;
  earthModel: "WGS84" | "FAI_SPHERE";
  turnpoints: XCTurnpoint[];
  sss: XCStartConfig;
  goal: XCGoalConfig;
  competition?: XCCompetitionInfo;
  metadata?: Record<string, unknown>;
}

/**
 * Validation error
 */
export class XctskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XctskValidationError";
  }
}

/**
 * Infer missing turnpoint types based on position
 * XCTrack format allows omitting type field:
 * - Before ESS: defaults to TURNPOINT
 * - After ESS (last turnpoint): defaults to GOAL
 */
function inferTurnpointTypes(turnpoints: XCTurnpoint[]): void {
  const essIndex = turnpoints.findIndex((tp) => tp.type === "ESS");

  turnpoints.forEach((tp, index) => {
    if (!tp.type) {
      if (essIndex === -1 || index < essIndex) {
        tp.type = "TURNPOINT";
      } else if (index === turnpoints.length - 1) {
        tp.type = "GOAL";
      } else {
        tp.type = "TURNPOINT";
      }
    }
  });
}

/**
 * Normalize turnpoint numeric values from strings to numbers
 * XCTrack files may have numeric values as strings (e.g., "1000" instead of 1000)
 * C# Newtonsoft.Json auto-converts these, but JSON.parse() does not
 */
function normalizeTurnpointValues(turnpoints: XCTurnpoint[]): void {
  turnpoints.forEach((tp) => {
    // Convert radius
    if (typeof tp.radius === "string") {
      (tp as { radius: number }).radius = parseFloat(tp.radius);
    }

    // Convert waypoint coordinates
    if (tp.waypoint) {
      if (typeof tp.waypoint.lat === "string") {
        (tp.waypoint as { lat: number }).lat = parseFloat(tp.waypoint.lat);
      }
      if (typeof tp.waypoint.lon === "string") {
        (tp.waypoint as { lon: number }).lon = parseFloat(tp.waypoint.lon);
      }
      if (typeof tp.waypoint.altSmoothed === "string") {
        (tp.waypoint as { altSmoothed: number }).altSmoothed = parseFloat(
          tp.waypoint.altSmoothed
        );
      }
    }
  });
}

/**
 * Parse an XCTrack .xctsk file and return a TaskDefinition
 *
 * @param filePath Path to the .xctsk file
 * @returns Parsed TaskDefinition ready for use
 */
export async function parseXctskFile(
  filePath: string
): Promise<TaskDefinition> {
  // Read and parse JSON
  const content = await fs.readFile(filePath, "utf-8");
  let xcTask: XCTask;

  try {
    xcTask = JSON.parse(content);
  } catch {
    throw new XctskValidationError("Invalid JSON format");
  }

  // Validate structure
  validateXCTask(xcTask);

  // Convert to internal format
  const taskImport = convertToTaskImport(xcTask, filePath);

  // Create full task definition with distance calculations
  return createTaskDefinition(taskImport, xcTask.goal.deadline);
}

/**
 * Parse .xctsk content from a string
 *
 * @param content JSON string content
 * @param taskName Optional name for the task
 * @returns Parsed TaskDefinition
 */
export function parseXctskContent(
  content: string,
  taskName?: string
): TaskDefinition {
  let xcTask: XCTask;

  try {
    xcTask = JSON.parse(content);
  } catch {
    throw new XctskValidationError("Invalid JSON format");
  }

  // Validate structure
  validateXCTask(xcTask);

  // Convert to internal format
  const taskImport = convertToTaskImportFromContent(xcTask, taskName);

  // Create full task definition with distance calculations
  return createTaskDefinition(taskImport, xcTask.goal.deadline);
}

/**
 * Validate XCTask structure
 */
function validateXCTask(xcTask: XCTask): void {
  // Normalize and infer turnpoint values before validation
  if (xcTask.turnpoints && Array.isArray(xcTask.turnpoints)) {
    normalizeTurnpointValues(xcTask.turnpoints);
    inferTurnpointTypes(xcTask.turnpoints);
  }

  // Check required fields
  if (!xcTask.taskType) {
    throw new XctskValidationError("Missing taskType field");
  }
  if (!xcTask.version) {
    throw new XctskValidationError("Missing version field");
  }
  if (!xcTask.earthModel) {
    throw new XctskValidationError("Missing earthModel field");
  }
  if (!xcTask.turnpoints || !Array.isArray(xcTask.turnpoints)) {
    throw new XctskValidationError("Missing or invalid turnpoints array");
  }
  if (!xcTask.sss) {
    throw new XctskValidationError("Missing sss configuration");
  }
  if (!xcTask.goal) {
    throw new XctskValidationError("Missing goal configuration");
  }

  // Validate taskType
  if (!["CLASSIC", "RACE", "ELAPSED_TIME"].includes(xcTask.taskType)) {
    throw new XctskValidationError(
      `Invalid taskType: ${xcTask.taskType}. Must be CLASSIC, RACE or ELAPSED_TIME`
    );
  }

  // Validate earthModel
  if (!["WGS84", "FAI_SPHERE"].includes(xcTask.earthModel)) {
    throw new XctskValidationError(
      `Invalid earthModel: ${xcTask.earthModel}. Must be WGS84 or FAI_SPHERE`
    );
  }

  // Validate turnpoints
  if (xcTask.turnpoints.length < 4) {
    throw new XctskValidationError(
      "Task must have at least 4 turnpoints (TAKEOFF, SSS, ESS, GOAL)"
    );
  }

  // Check required turnpoint types
  const types = xcTask.turnpoints.map((tp) => tp.type);
  const hasRequiredTypes =
    types.includes("TAKEOFF") &&
    types.includes("SSS") &&
    types.includes("ESS") &&
    types.includes("GOAL");

  if (!hasRequiredTypes) {
    throw new XctskValidationError(
      "Task must have TAKEOFF, SSS, ESS, and GOAL turnpoints"
    );
  }

  // Validate turnpoint order
  const sssIndex = types.indexOf("SSS");
  const esIndex = types.indexOf("ESS");
  const goalIndex = types.indexOf("GOAL");

  if (sssIndex >= esIndex) {
    throw new XctskValidationError("SSS must come before ESS");
  }
  if (esIndex >= goalIndex) {
    throw new XctskValidationError("ESS must come before GOAL");
  }

  // Validate each turnpoint
  xcTask.turnpoints.forEach((tp, index) => {
    validateTurnpoint(tp, index);
  });

  // Validate SSS configuration
  validateSSS(xcTask.sss);

  // Validate goal configuration
  validateGoal(xcTask.goal, xcTask.sss.timeGates);
}

/**
 * Validate a single turnpoint
 */
function validateTurnpoint(tp: XCTurnpoint, index: number): void {
  if (!tp.type) {
    throw new XctskValidationError(`Turnpoint ${index}: missing type`);
  }

  if (!["TAKEOFF", "SSS", "TURNPOINT", "ESS", "GOAL"].includes(tp.type)) {
    throw new XctskValidationError(
      `Turnpoint ${index}: invalid type ${tp.type}`
    );
  }

  if (typeof tp.radius !== "number" || tp.radius <= 0) {
    throw new XctskValidationError(
      `Turnpoint ${index}: radius must be a positive number`
    );
  }

  if (!tp.waypoint) {
    throw new XctskValidationError(`Turnpoint ${index}: missing waypoint data`);
  }

  const wp = tp.waypoint;
  if (!wp.name) {
    throw new XctskValidationError(`Turnpoint ${index}: missing waypoint name`);
  }

  if (typeof wp.lat !== "number" || wp.lat < -90 || wp.lat > 90) {
    throw new XctskValidationError(
      `Turnpoint ${index}: latitude must be between -90 and 90`
    );
  }

  if (typeof wp.lon !== "number" || wp.lon < -180 || wp.lon > 180) {
    throw new XctskValidationError(
      `Turnpoint ${index}: longitude must be between -180 and 180`
    );
  }

  if (typeof wp.altSmoothed !== "number") {
    throw new XctskValidationError(
      `Turnpoint ${index}: missing altitude (altSmoothed)`
    );
  }
}

/**
 * Validate SSS configuration
 */
function validateSSS(sss: XCStartConfig): void {
  if (!["RACE", "ELAPSED_TIME"].includes(sss.type)) {
    throw new XctskValidationError(
      `Invalid SSS type: ${sss.type}. Must be RACE or ELAPSED_TIME`
    );
  }

  if (!["ENTER", "EXIT"].includes(sss.direction)) {
    throw new XctskValidationError(
      `Invalid SSS direction: ${sss.direction}. Must be ENTER or EXIT`
    );
  }

  if (
    !sss.timeGates ||
    !Array.isArray(sss.timeGates) ||
    sss.timeGates.length === 0
  ) {
    throw new XctskValidationError("At least one time gate is required");
  }

  // Validate time gate format
  sss.timeGates.forEach((gate, index) => {
    if (!isValidISODateTime(gate)) {
      throw new XctskValidationError(
        `Time gate ${index}: invalid datetime format "${gate}"`
      );
    }
  });
}

/**
 * Validate goal configuration
 */
function validateGoal(goal: XCGoalConfig, timeGates: string[]): void {
  if (!["CYLINDER", "LINE"].includes(goal.type)) {
    throw new XctskValidationError(
      `Invalid goal type: ${goal.type}. Must be CYLINDER or LINE`
    );
  }

  if (!goal.deadline) {
    throw new XctskValidationError("Missing goal deadline");
  }

  if (!isValidISODateTime(goal.deadline)) {
    throw new XctskValidationError(`Invalid deadline format: ${goal.deadline}`);
  }

  // Check deadline is after all time gates (normalize for time-only formats)
  const deadlineTime = new Date(
    normalizeDateTimeString(goal.deadline)
  ).getTime();
  const lastGateTime = new Date(
    normalizeDateTimeString(timeGates[timeGates.length - 1])
  ).getTime();

  if (deadlineTime <= lastGateTime) {
    throw new XctskValidationError("Deadline must be after all time gates");
  }
}

/**
 * Check if string is a time-only format (HH:MM:SS or HH:MM:SSZ)
 */
function isTimeOnlyFormat(str: string): boolean {
  return /^\d{2}:\d{2}:\d{2}Z?$/.test(str);
}

/**
 * Normalize datetime string - converts time-only to full ISO with default date
 * XCTrack files may use time-only format (e.g., "04:30:00Z")
 */
function normalizeDateTimeString(str: string): string {
  if (isTimeOnlyFormat(str)) {
    // Use epoch date as default when only time is provided
    const time = str.endsWith("Z") ? str : str + "Z";
    return `1970-01-01T${time}`;
  }
  return str;
}

/**
 * Check if a string is a valid ISO datetime (or time-only format)
 */
function isValidISODateTime(dateStr: string): boolean {
  const normalized = normalizeDateTimeString(dateStr);
  const date = new Date(normalized);
  return !isNaN(date.getTime());
}

/**
 * Convert XCTask to XCTaskImport (internal format before distance calc)
 */
function convertToTaskImport(xcTask: XCTask, filePath: string): XCTaskImport {
  const fileName = path.basename(filePath, ".xctsk");
  const taskName = xcTask.competition?.name
    ? `${xcTask.competition.name} - ${fileName}`
    : fileName;

  return convertToTaskImportInternal(xcTask, taskName);
}

/**
 * Convert XCTask to XCTaskImport from content
 */
function convertToTaskImportFromContent(
  xcTask: XCTask,
  taskName?: string
): XCTaskImport {
  const name = taskName || xcTask.competition?.name || "Imported Task";
  return convertToTaskImportInternal(xcTask, name);
}

/**
 * Internal conversion function
 */
function convertToTaskImportInternal(
  xcTask: XCTask,
  taskName: string
): XCTaskImport {
  // Map turnpoints (normalize time-only datetime strings)
  const turnpoints: Turnpoint[] = xcTask.turnpoints.map((xcTp, index) => ({
    id: `tp-${index + 1}`,
    geopoint: {
      latitude: xcTp.waypoint.lat,
      longitude: xcTp.waypoint.lon,
      altitude: xcTp.waypoint.altSmoothed,
      name: xcTp.waypoint.name,
    } as GeoPoint,
    radius: Number(xcTp.radius),
    open: normalizeDateTimeString(xcTask.sss.timeGates[0]),
    close: normalizeDateTimeString(xcTask.goal.deadline),
    altitude: Number(xcTp.waypoint.altSmoothed),
    type: xcTp.type as TurnpointType,
  }));

  // Find SSS and ESS indices (1-based)
  const types = xcTask.turnpoints.map((tp) => tp.type);
  const ssIndex = types.indexOf("SSS") + 1;
  const esIndex = types.indexOf("ESS") + 1;

  // Map start gates (normalize time-only datetime strings)
  const startGates: StartGate[] = xcTask.sss.timeGates.map((gate) => ({
    open: normalizeDateTimeString(gate),
  }));

  // Map task type based on sss.type (start procedure type), not taskType (format type)
  const taskType: TaskType = xcTask.sss.type === "RACE" ? "Race" : "TimeTrial";

  // Map earth model
  const earthModel: EarthModel = xcTask.earthModel;

  // Map goal type
  const goalType: GoalType = xcTask.goal.type;

  return {
    name: taskName,
    taskType,
    earthModel,
    turnpoints,
    ssIndex,
    esIndex,
    goalType,
    startGates,
  };
}

/**
 * Create full TaskDefinition with distance calculations
 */
function createTaskDefinition(
  taskImport: XCTaskImport,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deadline: string
): TaskDefinition {
  // Calculate distances using shortest route algorithm
  const distances = calculateTaskDistances(
    taskImport.turnpoints,
    taskImport.ssIndex,
    taskImport.esIndex
  );

  // Extract date from first start gate
  const taskDate =
    taskImport.startGates[0]?.open?.split("T")[0] ||
    new Date().toISOString().split("T")[0];

  return {
    id: toSlug(taskImport.name),
    name: taskImport.name,
    date: taskDate,
    taskType: taskImport.taskType,
    earthModel: taskImport.earthModel,
    state: "Regular",
    turnpoints: taskImport.turnpoints,
    ssIndex: taskImport.ssIndex,
    esIndex: taskImport.esIndex,
    goalType: taskImport.goalType,
    startGates: taskImport.startGates,
    taskDistance: distances.taskDistance,
    speedSectionDistance: distances.speedSectionDistance,
    launchToEssDistance: distances.launchToEssDistance,
    legDistances: distances.legDistances,
    shortestRoute: distances.shortestRoute,
    qnhSetting: 1013.25,
    leadingTimeRatio: 0.26,
  };
}

/**
 * Validate and preview a task file without importing
 *
 * @param filePath Path to the .xctsk file
 * @returns Task preview with basic information
 */
export async function previewXctskFile(filePath: string): Promise<{
  valid: boolean;
  name: string;
  turnpointCount: number;
  taskType: string;
  earthModel: string;
  startGates: string[];
  deadline: string;
  errors: string[];
}> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const xcTask: XCTask = JSON.parse(content);

    const errors: string[] = [];

    // Basic validation
    try {
      validateXCTask(xcTask);
    } catch (err) {
      if (err instanceof XctskValidationError) {
        errors.push(err.message);
      }
    }

    const fileName = path.basename(filePath, ".xctsk");

    return {
      valid: errors.length === 0,
      name: xcTask.competition?.name || fileName,
      turnpointCount: xcTask.turnpoints?.length || 0,
      taskType: xcTask.taskType || "Unknown",
      earthModel: xcTask.earthModel || "Unknown",
      startGates: xcTask.sss?.timeGates || [],
      deadline: xcTask.goal?.deadline || "",
      errors,
    };
  } catch (err) {
    return {
      valid: false,
      name: path.basename(filePath),
      turnpointCount: 0,
      taskType: "Unknown",
      earthModel: "Unknown",
      startGates: [],
      deadline: "",
      errors: [`Failed to read file: ${err}`],
    };
  }
}
