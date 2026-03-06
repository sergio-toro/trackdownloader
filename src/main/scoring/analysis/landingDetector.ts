/**
 * Landing detection for flight tracks
 *
 * Ported from FS C# implementation (FsTaskFlight/Flight.cs FilterTracklog).
 *
 * FS detects landing using a 60-second sliding window. If the maximum ground
 * speed in the window is <= 5 m/s AND the altitude range is <= 10m, the pilot
 * is considered to have landed. The track is truncated at the start of that window.
 *
 * FS also filters the track:
 * 1. Skip to task open time
 * 2. Skip to within 20km of first TP
 * 3. Skip walking within first TP (takeoff)
 * 4. Require flying speed (>3 m/s) and leaving takeoff area
 * 5. Filter out GPS spikes (>60 m/s)
 *
 * After landing, FS tries subsequent track segments (FindBestTracklogSegment)
 * but only considers segments starting within 1000m of the first TP. Since
 * paraglider pilots don't relaunch from takeoff, this effectively means only
 * the first flight segment counts.
 */

import type { FlightFix } from "../types/flightAnalysis";
import type { Turnpoint } from "../types";
import { distance } from "../geo/distance";

const WINDOW_SEC = 60;
const SPEED_THRESHOLD = 5; // m/s (FS: LandingSpeedThreshold)
const ALT_THRESHOLD = 10; // meters (FS: LandingAltitudeChangeThreshold)
const FLYING_SPEED = 3; // m/s
const MAX_SPEED = 60; // m/s (216 km/h) - filter GPS spikes

/**
 * Flight data point for the landing detection window.
 * Matches FS FlightDataPoint (Flight.cs).
 */
interface FlightDataPoint {
  timestamp: number; // UTC total seconds
  altitude: number; // BaroAltitude (ALWAYS pressure altitude)
  groundSpeed: number; // dist/time in m/s
  index: number; // original fix index
}

/**
 * Monotonic deque node for O(1) sliding window max/min.
 * Implemented as a doubly-linked list for efficient front/back operations.
 */
interface DequeNode<T> {
  value: T;
  prev: DequeNode<T> | null;
  next: DequeNode<T> | null;
}

class Deque<T> {
  first: DequeNode<T> | null = null;
  last: DequeNode<T> | null = null;
  count = 0;

  addLast(value: T): void {
    const node: DequeNode<T> = { value, prev: this.last, next: null };
    if (this.last) {
      this.last.next = node;
    } else {
      this.first = node;
    }
    this.last = node;
    this.count++;
  }

  removeLast(): void {
    if (!this.last) return;
    if (this.last.prev) {
      this.last.prev.next = null;
      this.last = this.last.prev;
    } else {
      this.first = null;
      this.last = null;
    }
    this.count--;
  }

  removeFirst(): void {
    if (!this.first) return;
    if (this.first.next) {
      this.first.next.prev = null;
      this.first = this.first.next;
    } else {
      this.first = null;
      this.last = null;
    }
    this.count--;
  }
}

/**
 * Update monotonic deques with a new data point.
 * Matches FS UpdateDeques (Flight.cs).
 */
function updateDeques(
  newPoint: FlightDataPoint,
  maxSpeedDeque: Deque<FlightDataPoint>,
  maxAltitudeDeque: Deque<FlightDataPoint>,
  minAltitudeDeque: Deque<FlightDataPoint>
): void {
  // Max speed deque: remove smaller from back
  while (
    maxSpeedDeque.count > 0 &&
    maxSpeedDeque.last!.value.groundSpeed <= newPoint.groundSpeed
  ) {
    maxSpeedDeque.removeLast();
  }
  maxSpeedDeque.addLast(newPoint);

  // Max altitude deque: remove smaller from back
  while (
    maxAltitudeDeque.count > 0 &&
    maxAltitudeDeque.last!.value.altitude <= newPoint.altitude
  ) {
    maxAltitudeDeque.removeLast();
  }
  maxAltitudeDeque.addLast(newPoint);

  // Min altitude deque: remove larger from back
  while (
    minAltitudeDeque.count > 0 &&
    minAltitudeDeque.last!.value.altitude >= newPoint.altitude
  ) {
    minAltitudeDeque.removeLast();
  }
  minAltitudeDeque.addLast(newPoint);
}

/**
 * Check if current window represents a landing.
 * Matches FS IsLanding (Flight.cs).
 */
function isLanding(
  maxSpeedDeque: Deque<FlightDataPoint>,
  maxAltitudeDeque: Deque<FlightDataPoint>,
  minAltitudeDeque: Deque<FlightDataPoint>
): boolean {
  const currentMaxSpeed = maxSpeedDeque.first?.value.groundSpeed ?? 0;
  const currentMaxAlt = maxAltitudeDeque.first?.value.altitude ?? 0;
  const currentMinAlt = minAltitudeDeque.first?.value.altitude ?? 0;
  return (
    currentMaxSpeed <= SPEED_THRESHOLD &&
    currentMaxAlt - currentMinAlt <= ALT_THRESHOLD
  );
}

/**
 * Remove an old point from the front of deques if it matches.
 * Matches FS RemoveOldPoint (Flight.cs).
 */
function removeOldPoint(
  oldPoint: FlightDataPoint,
  maxSpeedDeque: Deque<FlightDataPoint>,
  maxAltitudeDeque: Deque<FlightDataPoint>,
  minAltitudeDeque: Deque<FlightDataPoint>
): void {
  if (maxSpeedDeque.first?.value === oldPoint) maxSpeedDeque.removeFirst();
  if (maxAltitudeDeque.first?.value === oldPoint)
    maxAltitudeDeque.removeFirst();
  if (minAltitudeDeque.first?.value === oldPoint)
    minAltitudeDeque.removeFirst();
}

/**
 * Detect landing in a flight track and return the truncation index.
 *
 * FS has two landing detection modes:
 * - Modern (default): 60-second window, maxSpeed ≤ 5 m/s AND altRange ≤ 10m
 * - Legacy: 4-minute average speed < 1 m/s
 *
 * @param fixes Flight fixes
 * @param taskOpenTime Task open timestamp (ms) - optional
 * @param firstTp First turnpoint (TAKEOFF) - optional, for skipping pre-flight
 * @param useLegacy Use legacy 4-minute average speed detection
 * @returns Index at which landing is detected (track should be truncated here)
 */
export function detectLandingIndex(
  fixes: FlightFix[],
  taskOpenTime?: number,
  firstTp?: Turnpoint,
  useLegacy?: boolean
): number {
  if (fixes.length < 2) return fixes.length;

  let startIdx = 0;
  const tp0Center = firstTp
    ? {
        latitude: firstTp.geopoint.latitude,
        longitude: firstTp.geopoint.longitude,
      }
    : null;
  const tp0Radius = firstTp?.radius ?? 0;

  // Step 1: Skip to task open time (minus 1 minute, like FS)
  if (taskOpenTime) {
    const startTime = taskOpenTime - 60000;
    while (startIdx < fixes.length && fixes[startIdx].timestamp < startTime) {
      startIdx++;
    }
  }

  // Step 2: Skip forward to within 20km of first TP
  if (tp0Center) {
    const searchRadius = 20000 + tp0Radius;
    while (startIdx < fixes.length) {
      const d = distance(
        {
          latitude: fixes[startIdx].latitude,
          longitude: fixes[startIdx].longitude,
        },
        tp0Center
      );
      if (d <= searchRadius) break;
      startIdx++;
    }
    if (startIdx >= fixes.length) return fixes.length;
  }

  // Step 3: Skip within first TP (walking before launch)
  if (tp0Center && tp0Radius > 0) {
    while (startIdx < fixes.length - 1) {
      const d1 = distance(
        {
          latitude: fixes[startIdx].latitude,
          longitude: fixes[startIdx].longitude,
        },
        tp0Center
      );
      const d2 = distance(
        {
          latitude: fixes[startIdx + 1].latitude,
          longitude: fixes[startIdx + 1].longitude,
        },
        tp0Center
      );
      if (d1 > tp0Radius && d2 > tp0Radius) break;
      startIdx++;
    }
  }

  // Step 4: Sliding window landing detection (matches FS Flight.cs exactly)
  let reachedFlyingSpeed = false;
  let doneFlyingAway = !tp0Center; // If no TP0, assume already away

  // Modern detection: monotonic deques for O(1) sliding window max/min
  const flightPointQ: FlightDataPoint[] = []; // Queue (FIFO)
  const maxSpeedDeque = new Deque<FlightDataPoint>();
  const maxAltitudeDeque = new Deque<FlightDataPoint>();
  const minAltitudeDeque = new Deque<FlightDataPoint>();

  // Legacy detection: 4-minute average speed
  const distQueue: number[] = [];
  const timeQueue: number[] = [];

  let iPrev = Math.max(0, startIdx);

  for (let i = Math.max(1, startIdx); i < fixes.length; i++) {
    const dt = (fixes[i].timestamp - fixes[iPrev].timestamp) / 1000;
    const d = distance(
      { latitude: fixes[i].latitude, longitude: fixes[i].longitude },
      { latitude: fixes[iPrev].latitude, longitude: fixes[iPrev].longitude }
    );
    const speed = dt > 0 ? d / dt : d > 0 ? Infinity : 0;

    // Track if left takeoff area
    if (!doneFlyingAway && tp0Center) {
      const distFromTO = distance(
        { latitude: fixes[i].latitude, longitude: fixes[i].longitude },
        tp0Center
      );
      if (distFromTO > tp0Radius) doneFlyingAway = true;
    }

    if (reachedFlyingSpeed && doneFlyingAway) {
      if (useLegacy) {
        // Legacy: 4-minute average speed < 1 m/s (FS Flight.cs lines 311-329)
        distQueue.push(d);
        timeQueue.push(dt);
        let sumTime = 0;
        for (let k = 0; k < timeQueue.length; k++) sumTime += timeQueue[k];
        const LEGACY_WINDOW = 240; // 4 minutes
        if (sumTime > LEGACY_WINDOW) {
          let sumDist = 0;
          for (let k = 0; k < distQueue.length; k++) sumDist += distQueue[k];
          const avgSpeed = sumDist / sumTime;
          if (avgSpeed < 1) {
            return i; // Legacy truncates at current fix
          }
          timeQueue.shift();
          distQueue.shift();
        }
      } else {
        // Modern: 60-second window with monotonic deques (FS Flight.cs lines 331-358)
        const fdp: FlightDataPoint = {
          altitude: fixes[i].pressureAltitude ?? fixes[i].gpsAltitude ?? 0,
          groundSpeed: speed,
          timestamp: fixes[i].timestamp / 1000,
          index: i,
        };

        flightPointQ.push(fdp);
        updateDeques(fdp, maxSpeedDeque, maxAltitudeDeque, minAltitudeDeque);

        const deltaT = fdp.timestamp - flightPointQ[0].timestamp;
        if (deltaT >= WINDOW_SEC) {
          if (isLanding(maxSpeedDeque, maxAltitudeDeque, minAltitudeDeque)) {
            return flightPointQ[0].index;
          } else {
            const oldPoint = flightPointQ.shift()!;
            removeOldPoint(
              oldPoint,
              maxSpeedDeque,
              maxAltitudeDeque,
              minAltitudeDeque
            );
          }
        }
      }
    }

    // reached_flyingspeed is set AFTER the landing block (matches FS)
    if (!reachedFlyingSpeed && speed > FLYING_SPEED) reachedFlyingSpeed = true;

    // Speed filter for main track output (NOT for landing window)
    if (!reachedFlyingSpeed || speed < MAX_SPEED) {
      iPrev = i;
    }
  }

  return fixes.length;
}
