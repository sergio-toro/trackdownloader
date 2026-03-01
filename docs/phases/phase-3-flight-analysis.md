# Phase 3: Flight Analysis

This phase implements IGC track analysis against task definitions.

## Goals

1. Extend existing IGC parser with scoring fields
2. Implement turnpoint crossing detection
3. Calculate distance flown, times, altitude data
4. Generate time-distance graph for leading coefficient

## Dependencies

- Phase 1 (Types, Storage)
- Phase 2 (Task Import, Geo Utilities)

## Files to Create

```
src/main/scoring/
├── analysis/
│   ├── flightAnalyzer.ts     # Main coordinator
│   ├── turnpointDetector.ts  # TP crossing detection
│   ├── distanceCalculator.ts # Distance calculations
│   └── timeDistanceGraph.ts  # LC graph generation
└── geo/
    └── cylinderCrossing.ts   # Cylinder geometry
```

---

## Flight Analysis Result

```typescript
// src/main/scoring/types/flightAnalysis.ts

import type { GeoPoint } from './geo';

export interface FlightFix {
  timestamp: number;          // Unix ms
  time: string;               // HH:MM:SS
  latitude: number;
  longitude: number;
  gpsAltitude: number | null;
  pressureAltitude: number | null;
  valid: boolean;
}

export interface TurnpointCrossing {
  turnpointIndex: number;
  time: Date;
  timestamp: number;
  fromFixIndex: number;
  toFixIndex: number;
  crossingPoint: GeoPoint;
  isEnter: boolean;
  distanceToCenter: number;
}

export interface TimeDist {
  dist: number;      // Distance flown in SS (meters)
  dist2es: number;   // Distance remaining to ESS (meters)
  time: number;      // Time since SS start (seconds)
  alt: number;       // Altitude
}

export interface FlightAnalysis {
  // Source
  pilotId: number;
  igcFilename: string;

  // Parsed track
  fixes: FlightFix[];

  // Turnpoint crossings
  crossings: TurnpointCrossing[][];  // Per turnpoint

  // Valid crossings (first valid per TP)
  validCrossings: (TurnpointCrossing | null)[];

  // Key times
  takeoffTime?: number;
  startTime?: number;           // SS crossing
  essTime?: number;             // ES crossing
  goalTime?: number;
  landingTime?: number;

  // Distances
  distanceFlown: number;        // meters
  realDistance: number;         // meters (unfloor'd)
  bonusDistance: number;        // For stopped tasks

  // Altitude
  maxAltitude: number;
  essAltitude?: number;

  // Time-distance graph for LC
  timeDistanceGraph: TimeDist[];

  // Status
  reachedGoal: boolean;
  isValid: boolean;
  validationErrors: string[];
}
```

---

## Turnpoint Crossing Detection

Based on `Flight.cs` lines 423-650:

```typescript
// src/main/scoring/analysis/turnpointDetector.ts

import type { FlightFix, TurnpointCrossing, Turnpoint } from '../types';
import { haversineDistance } from '../geo/distance';

export function findAllCrossings(
  fixes: FlightFix[],
  turnpoints: Turnpoint[],
  radiusTolerance: number = 0.001,
  minAbsTolerance: number = 5
): TurnpointCrossing[][] {
  const crossings: TurnpointCrossing[][] = turnpoints.map(() => []);

  for (let tpIdx = 0; tpIdx < turnpoints.length; tpIdx++) {
    const tp = turnpoints[tpIdx];
    const radiusOuter = Math.max(
      tp.radius * (1 + radiusTolerance),
      tp.radius + minAbsTolerance
    );
    const radiusInner = Math.min(
      tp.radius * (1 - radiusTolerance),
      tp.radius - minAbsTolerance
    );

    const tpOpen = new Date(tp.open).getTime();
    const tpClose = new Date(tp.close).getTime();

    for (let fixIdx = 1; fixIdx < fixes.length; fixIdx++) {
      const fix = fixes[fixIdx];
      const prevFix = fixes[fixIdx - 1];

      // Skip if outside time window
      if (fix.timestamp < tpOpen || fix.timestamp > tpClose) continue;

      const center = { latitude: tp.geopoint.latitude, longitude: tp.geopoint.longitude };
      const p0 = { latitude: prevFix.latitude, longitude: prevFix.longitude };
      const p1 = { latitude: fix.latitude, longitude: fix.longitude };

      const dist0 = haversineDistance(p0, center);
      const dist1 = haversineDistance(p1, center);

      // Check for crossing
      const crossedInner = (dist0 < radiusInner && dist1 >= radiusInner) ||
                           (dist0 >= radiusInner && dist1 < radiusInner);
      const crossedOuter = (dist0 <= radiusOuter && dist1 > radiusOuter) ||
                           (dist0 > radiusOuter && dist1 <= radiusOuter);

      if (crossedInner || crossedOuter) {
        const isEnter = dist0 > dist1;

        // Interpolate crossing point
        const totalDist = dist0 + dist1;
        const factor = totalDist > 0 ? dist0 / totalDist : 0.5;

        const crossingPoint = {
          latitude: p0.latitude + (p1.latitude - p0.latitude) * factor,
          longitude: p0.longitude + (p1.longitude - p0.longitude) * factor,
        };

        // Interpolate time
        const crossingTime = prevFix.timestamp +
          (fix.timestamp - prevFix.timestamp) * factor;

        crossings[tpIdx].push({
          turnpointIndex: tpIdx,
          time: new Date(crossingTime),
          timestamp: crossingTime,
          fromFixIndex: fixIdx - 1,
          toFixIndex: fixIdx,
          crossingPoint,
          isEnter,
          distanceToCenter: haversineDistance(crossingPoint, center),
        });
      }
    }
  }

  return crossings;
}

/**
 * Get first valid crossing for each turnpoint
 * (must cross in sequence)
 */
export function getValidCrossings(
  crossings: TurnpointCrossing[][],
  turnpoints: Turnpoint[]
): (TurnpointCrossing | null)[] {
  const validCrossings: (TurnpointCrossing | null)[] = [];
  let lastTime = 0;

  for (let i = 0; i < turnpoints.length; i++) {
    const tpCrossings = crossings[i].filter(c => c.timestamp > lastTime);

    // Find first ENTER crossing
    const enterCrossing = tpCrossings.find(c => c.isEnter);

    if (enterCrossing) {
      validCrossings.push(enterCrossing);
      lastTime = enterCrossing.timestamp;
    } else {
      validCrossings.push(null);
    }
  }

  return validCrossings;
}
```

---

## Distance Calculator

Based on `Flight.cs` lines 910-1122:

```typescript
// src/main/scoring/analysis/distanceCalculator.ts

import type { FlightFix, TaskDefinition, TurnpointCrossing } from '../types';
import { haversineDistance } from '../geo/distance';

export interface DistanceResult {
  distanceFlown: number;
  realDistance: number;
  bonusDistance: number;
  lastCountingFix: FlightFix;
  lastTurnpointReached: number;
}

export function calculateFlownDistance(
  fixes: FlightFix[],
  task: TaskDefinition,
  validCrossings: (TurnpointCrossing | null)[],
  minDistance: number = 7000 // 7 km in meters
): DistanceResult {
  // Determine last turnpoint reached
  let lastTpReached = 0;
  for (let i = validCrossings.length - 1; i >= 0; i--) {
    if (validCrossings[i]) {
      lastTpReached = i;
      break;
    }
  }

  // If reached goal
  const goalCrossing = validCrossings[task.turnpoints.length - 1];
  if (goalCrossing) {
    return {
      distanceFlown: task.taskDistance,
      realDistance: task.taskDistance,
      bonusDistance: 0,
      lastCountingFix: fixes[goalCrossing.toFixIndex],
      lastTurnpointReached: task.turnpoints.length - 1,
    };
  }

  // Find best distance after last TP
  let bestDistance = 0;
  let bestFix = fixes[fixes.length - 1];
  const startIdx = validCrossings[lastTpReached]?.toFixIndex || 0;

  for (let i = startIdx; i < fixes.length; i++) {
    const fix = fixes[i];
    const distToGoal = calculateDistanceToGoal(fix, task, lastTpReached + 1);
    const distance = task.taskDistance - distToGoal;

    if (distance > bestDistance) {
      bestDistance = distance;
      bestFix = fix;
    }
  }

  // Apply minimum distance floor
  const flooredDistance = Math.max(bestDistance, minDistance);

  return {
    distanceFlown: flooredDistance,
    realDistance: bestDistance,
    bonusDistance: 0,
    lastCountingFix: bestFix,
    lastTurnpointReached: lastTpReached,
  };
}

function calculateDistanceToGoal(
  fix: FlightFix,
  task: TaskDefinition,
  currentLeg: number
): number {
  let remaining = 0;

  // Distance to next TP
  if (currentLeg < task.turnpoints.length) {
    const nextTp = task.turnpoints[currentLeg];
    const distToCenter = haversineDistance(
      { latitude: fix.latitude, longitude: fix.longitude },
      { latitude: nextTp.geopoint.latitude, longitude: nextTp.geopoint.longitude }
    );
    remaining += Math.max(0, distToCenter - nextTp.radius);
  }

  // Add remaining leg distances
  for (let i = currentLeg; i < task.legDistances.length; i++) {
    remaining += task.legDistances[i];
  }

  return remaining;
}
```

---

## Time-Distance Graph

For leading coefficient calculation:

```typescript
// src/main/scoring/analysis/timeDistanceGraph.ts

import type { FlightFix, TaskDefinition, TurnpointCrossing, TimeDist } from '../types';
import { haversineDistance } from '../geo/distance';

export function generateTimeDistanceGraph(
  fixes: FlightFix[],
  task: TaskDefinition,
  validCrossings: (TurnpointCrossing | null)[]
): TimeDist[] {
  const graph: TimeDist[] = [];

  // Get SS start and ES crossings
  const ssCrossing = validCrossings[task.ssIndex - 1];
  const esCrossing = validCrossings[task.esIndex - 1];

  if (!ssCrossing) {
    return graph; // No SS crossing, can't calculate LC
  }

  // Initial point
  graph.push({
    dist: 0,
    time: 0,
    dist2es: task.speedSectionDistance,
    alt: task.turnpoints[task.esIndex - 1].altitude || 0,
  });

  const startTime = ssCrossing.timestamp;
  const endIdx = esCrossing?.toFixIndex || fixes.length - 1;

  let prevSsDist = 0;

  for (let i = ssCrossing.toFixIndex; i <= endIdx && i < fixes.length; i++) {
    const fix = fixes[i];

    // Determine current leg
    let currentLeg = task.ssIndex - 1;
    for (let j = task.ssIndex - 1; j <= task.esIndex - 1; j++) {
      const crossing = validCrossings[j];
      if (crossing && i > crossing.toFixIndex) {
        currentLeg = j + 1;
      }
    }

    // Calculate distance to ESS
    let distToEss = calculateDistanceToTurnpoint(
      fix,
      task,
      Math.min(currentLeg, task.esIndex - 1),
      task.esIndex - 1
    );

    const flownSsDist = task.speedSectionDistance - distToEss;

    // Only add if we've made progress
    if (flownSsDist > prevSsDist) {
      graph.push({
        dist: Math.max(0, flownSsDist),
        time: (fix.timestamp - startTime) / 1000, // seconds
        dist2es: Math.max(0, distToEss),
        alt: fix.pressureAltitude || fix.gpsAltitude || 0,
      });
      prevSsDist = flownSsDist;
    }
  }

  return graph;
}

function calculateDistanceToTurnpoint(
  fix: FlightFix,
  task: TaskDefinition,
  fromLeg: number,
  toLeg: number
): number {
  let distance = 0;

  // Distance from current position to next TP
  if (fromLeg < task.turnpoints.length) {
    const tp = task.turnpoints[fromLeg];
    const d = haversineDistance(
      { latitude: fix.latitude, longitude: fix.longitude },
      { latitude: tp.geopoint.latitude, longitude: tp.geopoint.longitude }
    );
    distance += Math.max(0, d - tp.radius);
  }

  // Add leg distances
  for (let i = fromLeg; i < toLeg && i < task.legDistances.length; i++) {
    distance += task.legDistances[i];
  }

  return distance;
}
```

---

## Flight Analyzer Coordinator

```typescript
// src/main/scoring/analysis/flightAnalyzer.ts

import * as fs from 'fs';
import { parse as parseIGC } from '../../lib/igc-parser';
import type { TaskDefinition, FlightAnalysis, FlightFix } from '../types';
import { findAllCrossings, getValidCrossings } from './turnpointDetector';
import { calculateFlownDistance } from './distanceCalculator';
import { generateTimeDistanceGraph } from './timeDistanceGraph';

export async function analyzeFlightForTask(
  igcPath: string,
  task: TaskDefinition,
  pilotId: number
): Promise<FlightAnalysis> {
  // Parse IGC file
  const content = fs.readFileSync(igcPath, 'utf-8');
  const igc = parseIGC(content, { lenient: true });

  // Convert to FlightFix array
  const fixes: FlightFix[] = igc.fixes.map(f => ({
    timestamp: f.timestamp,
    time: f.time,
    latitude: f.latitude,
    longitude: f.longitude,
    gpsAltitude: f.gpsAltitude,
    pressureAltitude: f.pressureAltitude,
    valid: f.valid,
  }));

  // Find all TP crossings
  const crossings = findAllCrossings(fixes, task.turnpoints);
  const validCrossings = getValidCrossings(crossings, task.turnpoints);

  // Calculate distances
  const distResult = calculateFlownDistance(fixes, task, validCrossings);

  // Generate time-distance graph
  const timeDistanceGraph = generateTimeDistanceGraph(fixes, task, validCrossings);

  // Determine key times
  const ssCrossing = validCrossings[task.ssIndex - 1];
  const esCrossing = validCrossings[task.esIndex - 1];
  const goalCrossing = validCrossings[task.turnpoints.length - 1];

  // Calculate max altitude
  const maxAltitude = Math.max(...fixes.map(f => f.gpsAltitude || f.pressureAltitude || 0));
  const essAltitude = esCrossing
    ? fixes[esCrossing.toFixIndex]?.gpsAltitude || fixes[esCrossing.toFixIndex]?.pressureAltitude
    : undefined;

  return {
    pilotId,
    igcFilename: igcPath,
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
    reachedGoal: !!goalCrossing,
    isValid: true,
    validationErrors: [],
  };
}
```

---

## Validation Checklist

- [ ] Turnpoint crossings detected correctly
- [ ] Distance calculations match FS
- [ ] Time-distance graph generated correctly
- [ ] Edge cases handled (no crossings, partial flight)

## Next Phase

[Phase 4: Scoring Engine](./phase-4-scoring-engine.md) - Implement GAP scoring formulas
