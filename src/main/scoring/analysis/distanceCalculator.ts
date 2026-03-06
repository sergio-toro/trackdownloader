/**
 * Distance calculation for flight analysis
 *
 * Ported from FS C# implementation (FsTaskFlight/Flight.cs lines 910-1122)
 */

import type {
  FlightFix,
  TurnpointCrossing,
  DistanceResult,
} from "../types/flightAnalysis";
import type { TaskDefinition } from "../types/task";
import { distance } from "../geo/distance";
import { calculateShortestRouteToGoal } from "../geo/shortestRoute";
import { getLastReachedTurnpoint } from "./turnpointDetector";

/**
 * Default minimum distance floor in meters (7km)
 */
const DEFAULT_MIN_DISTANCE = 7000;

/**
 * Calculate the flown distance for a flight
 *
 * @param fixes Flight fixes
 * @param task Task definition
 * @param validCrossings Valid turnpoint crossings
 * @param minDistance Minimum distance floor (default 7000m)
 * @returns Distance calculation result
 */
export function calculateFlownDistance(
  fixes: FlightFix[],
  task: TaskDefinition,
  validCrossings: (TurnpointCrossing | null)[],
  minDistance: number = DEFAULT_MIN_DISTANCE
): DistanceResult {
  if (fixes.length === 0) {
    return {
      distanceFlown: 0,
      realDistance: 0,
      bonusDistance: 0,
      lastCountingFix: fixes[0] || createEmptyFix(),
      lastTurnpointReached: -1,
    };
  }

  // Determine last turnpoint reached
  const lastTpReached = getLastReachedTurnpoint(validCrossings);

  // Check if goal was reached (last turnpoint)
  const goalIndex = task.turnpoints.length - 1;
  const goalCrossing = validCrossings[goalIndex];

  if (goalCrossing) {
    // Pilot reached goal - full task distance
    return {
      distanceFlown: task.taskDistance,
      realDistance: task.taskDistance,
      bonusDistance: 0,
      lastCountingFix: fixes[goalCrossing.toFixIndex],
      lastTurnpointReached: goalIndex,
    };
  }

  // Pilot did not reach goal - find best distance
  const startIdx =
    lastTpReached >= 0 && validCrossings[lastTpReached]
      ? validCrossings[lastTpReached]!.toFixIndex
      : 0;

  let bestDistance = 0;
  let bestFix = fixes[fixes.length - 1];
  let bestDistToGoal = task.taskDistance;

  // Search for best distance position using optimized shortest route.
  // FS calls GetQuickestRouteToGoal for every tracklog point.
  // We optimize by first doing a quick distance-to-next-TP check and
  // only running the full route optimizer when it could improve.
  const nextLeg = lastTpReached + 1;
  const nextTp =
    nextLeg < task.turnpoints.length ? task.turnpoints[nextLeg] : null;

  for (let i = startIdx; i < fixes.length; i++) {
    const fix = fixes[i];

    // Quick check: if distance to next TP center is larger than current best
    // approach distance, this fix can't improve the result
    if (nextTp) {
      const distToCenter = distance(
        { latitude: fix.latitude, longitude: fix.longitude },
        {
          latitude: nextTp.geopoint.latitude,
          longitude: nextTp.geopoint.longitude,
        }
      );
      if (distToCenter - nextTp.radius >= bestDistToGoal) {
        continue;
      }
    }

    const distToGoal = calculateDistanceToGoal(fix, task, nextLeg);
    if (distToGoal < bestDistToGoal) {
      bestDistToGoal = distToGoal;
      bestDistance = task.taskDistance - distToGoal;
      bestFix = fix;
    }
  }

  // Apply minimum distance floor, then cap at task distance (GAP.cs line 877)
  const flooredDistance = Math.max(bestDistance, minDistance);
  const cappedDistance = Math.min(flooredDistance, task.taskDistance);

  return {
    distanceFlown: cappedDistance,
    realDistance: bestDistance,
    bonusDistance: 0,
    lastCountingFix: bestFix,
    lastTurnpointReached: lastTpReached,
  };
}

/**
 * Calculate distance remaining to goal from a position
 *
 * Uses iterative shortest route optimization (matching FS GetQuickestRouteToGoal)
 * to compute the optimal path from the pilot's position through all remaining
 * turnpoints to goal.
 *
 * @param fix Current position
 * @param task Task definition
 * @param currentLeg Current leg index (next turnpoint to reach)
 * @returns Distance to goal in meters
 */
export function calculateDistanceToGoal(
  fix: FlightFix,
  task: TaskDefinition,
  currentLeg: number
): number {
  if (currentLeg >= task.turnpoints.length) {
    return 0;
  }

  const position = {
    latitude: fix.latitude,
    longitude: fix.longitude,
  };

  return calculateShortestRouteToGoal(position, task.turnpoints, currentLeg);
}

/**
 * Calculate distance to a specific turnpoint from a position
 *
 * @param fix Current position
 * @param task Task definition
 * @param fromLeg Starting leg index
 * @param toLeg Target turnpoint index
 * @returns Distance in meters
 */
export function calculateDistanceToTurnpoint(
  fix: FlightFix,
  task: TaskDefinition,
  fromLeg: number,
  toLeg: number
): number {
  let distanceRemaining = 0;

  // Distance from current position to next turnpoint
  if (fromLeg < task.turnpoints.length) {
    const tp = task.turnpoints[fromLeg];
    const d = distance(
      { latitude: fix.latitude, longitude: fix.longitude },
      { latitude: tp.geopoint.latitude, longitude: tp.geopoint.longitude }
    );
    distanceRemaining += Math.max(0, d - tp.radius);
  }

  // Add leg distances up to target
  for (let i = fromLeg; i < toLeg && i < task.legDistances.length; i++) {
    distanceRemaining += task.legDistances[i];
  }

  return distanceRemaining;
}

/**
 * Calculate bonus distance for stopped tasks (altitude bonus)
 *
 * @param fix Position at task stop
 * @param goalAltitude Goal altitude
 * @param glideRatio Glide ratio for bonus calculation
 * @returns Bonus distance in meters
 */
export function calculateBonusDistance(
  fix: FlightFix,
  goalAltitude: number,
  glideRatio: number
): number {
  const altitude = fix.pressureAltitude ?? fix.gpsAltitude ?? 0;
  const altitudeAboveGoal = Math.max(0, altitude - goalAltitude);
  return altitudeAboveGoal * glideRatio;
}

/**
 * Create an empty fix for edge cases
 */
function createEmptyFix(): FlightFix {
  return {
    timestamp: 0,
    time: "00:00:00",
    latitude: 0,
    longitude: 0,
    gpsAltitude: null,
    pressureAltitude: null,
    valid: false,
  };
}
