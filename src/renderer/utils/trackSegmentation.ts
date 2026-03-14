import type { FlightFix, Turnpoint } from "@main/scoring/types";

export interface TrackSegments {
  beforeSS: FlightFix[];
  racing: FlightFix[];
  afterGoal: FlightFix[];
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371008.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function segmentTrack(
  fixes: FlightFix[],
  turnpoints: Turnpoint[]
): TrackSegments {
  const validFixes = fixes.filter((f) => f.valid);
  if (validFixes.length === 0) {
    return { beforeSS: [], racing: [], afterGoal: [] };
  }

  // Find SSS turnpoint and its open time
  const sss = turnpoints.find((tp) => tp.type === "SSS");
  let ssOpenMs = -Infinity;
  if (sss) {
    ssOpenMs = new Date(sss.open).getTime();
  }

  // Find GOAL turnpoint
  const goal = turnpoints.find((tp) => tp.type === "GOAL");

  // Split at SSS open time
  let ssBoundaryIdx = -1;
  if (sss) {
    for (let i = 0; i < validFixes.length; i++) {
      if (validFixes[i].timestamp >= ssOpenMs) {
        ssBoundaryIdx = i;
        break;
      }
    }
  }

  let beforeSS: FlightFix[];
  let rest: FlightFix[];

  if (ssBoundaryIdx <= 0) {
    // No SSS or first fix is already past SSS open
    beforeSS = [];
    rest = validFixes;
  } else {
    // Include boundary fix in both segments
    beforeSS = validFixes.slice(0, ssBoundaryIdx + 1);
    rest = validFixes.slice(ssBoundaryIdx);
  }

  // Find goal entry in the rest
  let goalBoundaryIdx = -1;
  if (goal) {
    const goalLat = goal.geopoint.latitude;
    const goalLon = goal.geopoint.longitude;
    const goalRadius = goal.radius;
    for (let i = 0; i < rest.length; i++) {
      const dist = haversineDistance(
        rest[i].latitude,
        rest[i].longitude,
        goalLat,
        goalLon
      );
      if (dist <= goalRadius) {
        goalBoundaryIdx = i;
        break;
      }
    }
  }

  let racing: FlightFix[];
  let afterGoal: FlightFix[];

  if (goalBoundaryIdx < 0) {
    racing = rest;
    afterGoal = [];
  } else {
    // Include boundary fix in both segments
    racing = rest.slice(0, goalBoundaryIdx + 1);
    afterGoal = rest.slice(goalBoundaryIdx);
  }

  return { beforeSS, racing, afterGoal };
}
