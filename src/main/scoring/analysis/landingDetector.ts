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
 * Detect landing in a flight track and return the truncation index.
 *
 * @param fixes Flight fixes
 * @param taskOpenTime Task open timestamp (ms) - optional
 * @param firstTp First turnpoint (TAKEOFF) - optional, for skipping pre-flight
 * @returns Index at which landing is detected (track should be truncated here)
 */
export function detectLandingIndex(
  fixes: FlightFix[],
  taskOpenTime?: number,
  firstTp?: Turnpoint,
  scoringAltitude?: "GPS" | "QNH"
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

  // Step 4: Sliding window landing detection
  let reachedFlyingSpeed = false;
  let doneFlyingAway = !tp0Center; // If no TP0, assume already away

  // Window data points
  const window: { speed: number; alt: number; time: number; idx: number }[] =
    [];

  for (let i = Math.max(1, startIdx); i < fixes.length; i++) {
    const dt = (fixes[i].timestamp - fixes[i - 1].timestamp) / 1000;
    if (dt <= 0) continue;

    const d = distance(
      { latitude: fixes[i].latitude, longitude: fixes[i].longitude },
      { latitude: fixes[i - 1].latitude, longitude: fixes[i - 1].longitude }
    );
    const speed = d / dt;

    // Track if left takeoff area
    if (!doneFlyingAway && tp0Center) {
      const distFromTO = distance(
        { latitude: fixes[i].latitude, longitude: fixes[i].longitude },
        tp0Center
      );
      if (distFromTO > tp0Radius) doneFlyingAway = true;
    }

    if (!reachedFlyingSpeed && speed > FLYING_SPEED) reachedFlyingSpeed = true;

    if (reachedFlyingSpeed && doneFlyingAway) {
      // Filter GPS speed spikes (FS: dist / time < 60)
      if (speed < MAX_SPEED) {
        const alt =
          scoringAltitude === "GPS"
            ? (fixes[i].gpsAltitude ?? fixes[i].pressureAltitude ?? 0)
            : (fixes[i].pressureAltitude ?? fixes[i].gpsAltitude ?? 0);
        const timeSec = fixes[i].timestamp / 1000;

        window.push({ speed, alt, time: timeSec, idx: i });

        // Check when window spans >= 60 seconds
        while (
          window.length > 1 &&
          window[window.length - 1].time - window[0].time >= WINDOW_SEC
        ) {
          // Check landing condition over current window
          let maxSpeed = 0;
          let maxAlt = -Infinity;
          let minAlt = Infinity;
          for (const fp of window) {
            if (fp.speed > maxSpeed) maxSpeed = fp.speed;
            if (fp.alt > maxAlt) maxAlt = fp.alt;
            if (fp.alt < minAlt) minAlt = fp.alt;
          }
          if (maxSpeed <= SPEED_THRESHOLD && maxAlt - minAlt <= ALT_THRESHOLD) {
            return window[0].idx;
          }
          window.shift();
        }
      }
    }
  }

  return fixes.length;
}
