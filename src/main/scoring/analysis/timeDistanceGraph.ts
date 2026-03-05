/**
 * Time-distance graph generation for leading coefficient calculation
 *
 * The time-distance graph tracks distance flown vs time in the speed section.
 * This data is used to calculate the Leading Coefficient (LC) which rewards
 * pilots who lead the race.
 */

import type {
  FlightFix,
  TurnpointCrossing,
  TimeDist,
} from "../types/flightAnalysis";
import type { TaskDefinition } from "../types/task";
import { calculateShortestRouteToGoal } from "../geo/shortestRoute";

/**
 * Generate time-distance graph for leading coefficient calculation
 *
 * The graph tracks:
 * - dist: Distance flown within speed section (meters)
 * - dist2es: Distance remaining to ESS (meters)
 * - time: Time since SS start (seconds)
 * - alt: Altitude at each point
 *
 * @param fixes Flight fixes
 * @param task Task definition
 * @param validCrossings Valid turnpoint crossings
 * @returns Time-distance graph points
 */
export function generateTimeDistanceGraph(
  fixes: FlightFix[],
  task: TaskDefinition,
  validCrossings: (TurnpointCrossing | null)[]
): TimeDist[] {
  const graph: TimeDist[] = [];

  // Get SS and ES indices (1-based in task, convert to 0-based)
  const ssIdx = task.ssIndex - 1;
  const esIdx = task.esIndex - 1;

  // Get SS crossing (speed section start)
  const ssCrossing = validCrossings[ssIdx];
  if (!ssCrossing) {
    // No SS crossing - cannot calculate LC graph
    return graph;
  }

  // Get ES crossing (end of speed section)
  const esCrossing = validCrossings[esIdx];

  // FS uses SS open time (gate time) as time reference, not pilot's crossing time.
  // This matches FS Flight.cs line 1006: startTimeSeconds = Turnpoints[SsTpNo-1].Open
  const ssTp = task.turnpoints[ssIdx];
  const ssOpenTime = ssTp?.open
    ? new Date(ssTp.open).getTime()
    : ssCrossing.timestamp;

  // Initial point at time=0 (gate open)
  graph.push({
    dist: 0,
    time: 0,
    dist2es: task.speedSectionDistance,
    alt: getAltitude(fixes[ssCrossing.toFixIndex]),
  });

  const startTime = ssOpenTime;
  const endIdx = esCrossing ? esCrossing.toFixIndex : fixes.length - 1;

  let bestFlownDist = 0;

  // Process fixes from SS to ES (or end of track)
  // Only add entries when pilot makes forward progress (flownSsDist > prevSsDist)
  // This matches FS behavior (Flight.cs CreateTimeDistanceGraphEntry)
  for (let i = ssCrossing.toFixIndex; i <= endIdx && i < fixes.length; i++) {
    const fix = fixes[i];

    // Skip if before SS crossing time
    if (fix.timestamp < startTime) {
      continue;
    }

    // Determine current leg based on valid crossings
    let currentLeg = ssIdx;
    for (let j = ssIdx; j <= esIdx; j++) {
      const crossing = validCrossings[j];
      if (crossing && i > crossing.toFixIndex) {
        currentLeg = j + 1;
      }
    }

    // Calculate distance to ESS using optimized shortest route (matches FS GetShortestRoute)
    const position = { latitude: fix.latitude, longitude: fix.longitude };
    const distToEss = calculateShortestRouteToGoal(
      position,
      task.turnpoints,
      Math.min(currentLeg, esIdx),
      esIdx
    );

    // Distance flown in speed section
    const flownSsDist = task.speedSectionDistance - distToEss;

    // Only add entry when pilot makes forward progress (matches FS)
    if (flownSsDist <= bestFlownDist) {
      continue;
    }

    bestFlownDist = flownSsDist;

    const time = (fix.timestamp - startTime) / 1000;

    graph.push({
      dist: Math.max(0, bestFlownDist),
      time,
      dist2es: Math.max(0, distToEss),
      alt: getAltitude(fix),
    });
  }

  // Add final point at ESS if reached
  if (esCrossing) {
    const essFix = fixes[esCrossing.toFixIndex];
    const essTime = (esCrossing.timestamp - startTime) / 1000;

    // Only add if different from last entry
    const lastEntry = graph[graph.length - 1];
    if (!lastEntry || lastEntry.time < essTime) {
      graph.push({
        dist: task.speedSectionDistance,
        time: essTime,
        dist2es: 0,
        alt: getAltitude(essFix),
      });
    }
  }

  return graph;
}

/**
 * Get altitude from a fix (prefer pressure altitude)
 */
function getAltitude(fix: FlightFix): number {
  return fix.pressureAltitude ?? fix.gpsAltitude ?? 0;
}

/**
 * Calculate speed section time in seconds
 *
 * @param validCrossings Valid turnpoint crossings
 * @param task Task definition
 * @returns Time in seconds, or null if SS or ES not reached
 */
export function calculateSpeedSectionTime(
  validCrossings: (TurnpointCrossing | null)[],
  task: TaskDefinition
): number | null {
  const ssIdx = task.ssIndex - 1;
  const esIdx = task.esIndex - 1;

  const ssCrossing = validCrossings[ssIdx];
  const esCrossing = validCrossings[esIdx];

  if (!ssCrossing || !esCrossing) {
    return null;
  }

  return (esCrossing.timestamp - ssCrossing.timestamp) / 1000;
}

/**
 * Calculate average speed in speed section
 *
 * @param validCrossings Valid turnpoint crossings
 * @param task Task definition
 * @returns Speed in km/h, or null if SS or ES not reached
 */
export function calculateSpeedSectionSpeed(
  validCrossings: (TurnpointCrossing | null)[],
  task: TaskDefinition
): number | null {
  const time = calculateSpeedSectionTime(validCrossings, task);

  if (time === null || time === 0) {
    return null;
  }

  // Convert m/s to km/h
  const speedMs = task.speedSectionDistance / time;
  return speedMs * 3.6;
}
