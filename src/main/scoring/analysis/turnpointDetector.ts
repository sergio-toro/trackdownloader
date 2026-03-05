/**
 * Turnpoint crossing detection for flight analysis
 *
 * Ported from FS C# implementation (FsTaskFlight/Flight.cs lines 419-649)
 */

import type { FlightFix, TurnpointCrossing } from "../types/flightAnalysis";
import type { Turnpoint } from "../types/task";
import { distance } from "../geo/distance";

/**
 * Default radius tolerance as fraction (0.1%)
 */
const DEFAULT_RADIUS_TOLERANCE = 0.001;

/**
 * Default minimum absolute tolerance in meters
 */
const DEFAULT_MIN_ABS_TOLERANCE = 5;

/**
 * Find all cylinder crossings for each turnpoint
 *
 * @param fixes Flight fixes (GPS points)
 * @param turnpoints Task turnpoints
 * @param radiusTolerance Radius tolerance as fraction (default 0.001)
 * @param minAbsTolerance Minimum absolute tolerance in meters (default 5)
 * @returns Array of crossings per turnpoint
 */
export function findAllCrossings(
  fixes: FlightFix[],
  turnpoints: Turnpoint[],
  radiusTolerance: number = DEFAULT_RADIUS_TOLERANCE,
  minAbsTolerance: number = DEFAULT_MIN_ABS_TOLERANCE
): TurnpointCrossing[][] {
  const crossings: TurnpointCrossing[][] = turnpoints.map(
    (): TurnpointCrossing[] => []
  );

  if (fixes.length < 2) {
    return crossings;
  }

  for (let tpIdx = 0; tpIdx < turnpoints.length; tpIdx++) {
    const tp = turnpoints[tpIdx];

    // Calculate tolerance bands
    const radiusOuter = Math.max(
      tp.radius * (1 + radiusTolerance),
      tp.radius + minAbsTolerance
    );
    const radiusInner = Math.min(
      tp.radius * (1 - radiusTolerance),
      Math.max(0, tp.radius - minAbsTolerance)
    );

    // Parse time window
    const tpOpen = new Date(tp.open).getTime();
    const tpClose = new Date(tp.close).getTime();

    const center = {
      latitude: tp.geopoint.latitude,
      longitude: tp.geopoint.longitude,
    };

    for (let fixIdx = 1; fixIdx < fixes.length; fixIdx++) {
      const fix = fixes[fixIdx];
      const prevFix = fixes[fixIdx - 1];

      // Skip if outside time window
      if (fix.timestamp < tpOpen || fix.timestamp > tpClose) {
        continue;
      }

      const p0 = { latitude: prevFix.latitude, longitude: prevFix.longitude };
      const p1 = { latitude: fix.latitude, longitude: fix.longitude };

      const dist0 = distance(p0, center);
      const dist1 = distance(p1, center);

      // Check for crossing at inner or outer tolerance band
      const crossedInner =
        (dist0 < radiusInner && dist1 >= radiusInner) ||
        (dist0 >= radiusInner && dist1 < radiusInner);

      const crossedOuter =
        (dist0 <= radiusOuter && dist1 > radiusOuter) ||
        (dist0 > radiusOuter && dist1 <= radiusOuter);

      if (crossedInner || crossedOuter) {
        // Determine crossing direction
        const isEnter = dist0 > dist1;

        // Interpolate crossing point
        const totalDist =
          Math.abs(dist0 - tp.radius) + Math.abs(dist1 - tp.radius);
        const factor =
          totalDist > 0 ? Math.abs(dist0 - tp.radius) / totalDist : 0.5;

        const crossingPoint = {
          latitude: p0.latitude + (p1.latitude - p0.latitude) * factor,
          longitude: p0.longitude + (p1.longitude - p0.longitude) * factor,
        };

        // Interpolate time
        const crossingTime =
          prevFix.timestamp + (fix.timestamp - prevFix.timestamp) * factor;

        crossings[tpIdx].push({
          turnpointIndex: tpIdx,
          time: new Date(crossingTime),
          timestamp: crossingTime,
          fromFixIndex: fixIdx - 1,
          toFixIndex: fixIdx,
          crossingPoint,
          isEnter,
          distanceToCenter: distance(crossingPoint, center),
        });
      }
    }
  }

  return crossings;
}

/**
 * Get first valid crossing for each turnpoint in sequence
 *
 * A valid crossing must:
 * - Be an EXIT crossing for SSS/TAKEOFF turnpoints (pilot exits cylinder)
 * - Be an ENTER crossing for all other turnpoints (pilot enters cylinder)
 * - Occur after the previous turnpoint's valid crossing
 * - Respect chronological order
 *
 * @param crossings All detected crossings per turnpoint
 * @param turnpoints Task turnpoints
 * @returns Array of valid crossings (null if turnpoint not reached)
 */
export function getValidCrossings(
  crossings: TurnpointCrossing[][],
  turnpoints: Turnpoint[]
): (TurnpointCrossing | null)[] {
  const validCrossings: (TurnpointCrossing | null)[] = [];
  let lastTime = 0;

  for (let i = 0; i < turnpoints.length; i++) {
    const tp = turnpoints[i];
    // Filter crossings that occur after the last valid crossing
    const tpCrossings = crossings[i].filter((c) => c.timestamp > lastTime);

    // SSS and TAKEOFF require EXIT crossing (pilot starts inside, exits to begin race)
    // All other turnpoints require ENTER crossing
    const isExitType = tp.type === "SSS" || tp.type === "TAKEOFF";
    const crossing = tpCrossings.find((c) =>
      isExitType ? !c.isEnter : c.isEnter
    );

    if (crossing) {
      validCrossings.push(crossing);
      // TAKEOFF crossing should not constrain subsequent turnpoint timing.
      // In PG race tasks, TAKEOFF and SSS are co-located — pilots launch before
      // the gate opens and the TAKEOFF exit may occur well after the SSS exit.
      // Only SSS (and later turnpoints) should advance the lastTime constraint.
      if (tp.type !== "TAKEOFF") {
        lastTime = crossing.timestamp;
      }
    } else {
      validCrossings.push(null);
      // TAKEOFF is optional — missing it doesn't break the sequence.
      // For all other turnpoints: FS requires an unbroken sequence,
      // so missing any non-TAKEOFF turnpoint stops the chain.
      if (tp.type !== "TAKEOFF") {
        for (let j = i + 1; j < turnpoints.length; j++) {
          validCrossings.push(null);
        }
        break;
      }
    }
  }

  return validCrossings;
}

/**
 * Check if a pilot reached a specific turnpoint
 *
 * @param validCrossings Valid crossings array
 * @param turnpointIndex Turnpoint index to check
 * @returns true if the turnpoint was reached
 */
export function reachedTurnpoint(
  validCrossings: (TurnpointCrossing | null)[],
  turnpointIndex: number
): boolean {
  return (
    turnpointIndex >= 0 &&
    turnpointIndex < validCrossings.length &&
    validCrossings[turnpointIndex] !== null
  );
}

/**
 * Get the index of the last reached turnpoint
 *
 * @param validCrossings Valid crossings array
 * @returns Index of last reached turnpoint, or -1 if none
 */
export function getLastReachedTurnpoint(
  validCrossings: (TurnpointCrossing | null)[]
): number {
  for (let i = validCrossings.length - 1; i >= 0; i--) {
    if (validCrossings[i] !== null) {
      return i;
    }
  }
  return -1;
}
