# Phase 2: Task Import

This phase implements XCTrack .xctsk file parsing and task distance calculations.

## Goals

1. Parse XCTrack .xctsk JSON files
2. Calculate shortest route distances
3. Create task import UI

## Dependencies

- Phase 1 (Types, Storage, IPC)

## Files to Create

```
src/main/scoring/
├── import/
│   └── xctaskImporter.ts     # XCTrack parser
└── geo/
    ├── distance.ts           # Distance calculations
    └── shortestRoute.ts      # Route optimization

src/renderer/components/task/
├── ImportXctskDialog.tsx
├── TaskDefinition.tsx
└── WaypointTable.tsx
```

---

## XCTrack .xctsk Format

### Structure

```json
{
  "taskType": "RACE",
  "version": 1,
  "earthModel": "WGS84",
  "turnpoints": [
    {
      "type": "TAKEOFF",
      "radius": 400,
      "waypoint": {
        "name": "Launch",
        "description": "",
        "lat": 42.123456,
        "lon": -3.456789,
        "altSmoothed": 1200
      }
    },
    {
      "type": "SSS",
      "radius": 2000,
      "waypoint": { ... }
    },
    {
      "type": "ESS",
      "radius": 2000,
      "waypoint": { ... }
    },
    {
      "type": "GOAL",
      "radius": 400,
      "waypoint": { ... }
    }
  ],
  "sss": {
    "type": "RACE",
    "direction": "ENTER",
    "timeGates": ["2024-06-15T11:00:00Z"]
  },
  "goal": {
    "type": "LINE",
    "deadline": "2024-06-15T18:00:00Z"
  }
}
```

---

## XCTrack Parser

```typescript
// src/main/scoring/import/xctaskImporter.ts

import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { TaskDefinition, Turnpoint, StartGate, TaskType, GoalType, EarthModel } from '../types';
import { calculateShortestRoute, calculateTaskDistances } from '../geo/shortestRoute';

interface XCTurnpoint {
  type: string;
  radius: number;
  waypoint: {
    name: string;
    description: string;
    lat: number;
    lon: number;
    altSmoothed: number;
  };
}

interface XCTask {
  taskType: string;
  version: number;
  earthModel: string;
  turnpoints: XCTurnpoint[];
  sss?: {
    type: string;
    direction: string;
    timeGates: string[];
  };
  goal?: {
    type: string;
    deadline: string;
  };
}

export async function parseXctskFile(filePath: string): Promise<TaskDefinition> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const xcTask: XCTask = JSON.parse(content);

  // Map turnpoint types
  const turnpoints: Turnpoint[] = xcTask.turnpoints.map((tp, index) => ({
    id: `TP${index + 1}`,
    geopoint: {
      latitude: tp.waypoint.lat,
      longitude: tp.waypoint.lon,
      altitude: tp.waypoint.altSmoothed,
      name: tp.waypoint.name,
    },
    radius: tp.radius,
    open: xcTask.sss?.timeGates?.[0] || new Date().toISOString(),
    close: xcTask.goal?.deadline || new Date().toISOString(),
    altitude: tp.waypoint.altSmoothed,
    type: mapTurnpointType(tp.type),
  }));

  // Find SS and ES indices
  const ssIndex = turnpoints.findIndex(tp => tp.type === 'SSS') + 1;
  const esIndex = turnpoints.findIndex(tp => tp.type === 'ESS') + 1;

  // Map start gates
  const startGates: StartGate[] = (xcTask.sss?.timeGates || []).map(time => ({
    open: time,
  }));

  // Calculate distances
  const { shortestRoute, legDistances, taskDistance, speedSectionDistance, launchToEssDistance } =
    calculateTaskDistances(turnpoints, ssIndex, esIndex);

  const task: TaskDefinition = {
    id: uuidv4(),
    name: `Task ${new Date().toLocaleDateString()}`,
    date: new Date().toISOString().split('T')[0],
    taskType: mapTaskType(xcTask.taskType),
    earthModel: mapEarthModel(xcTask.earthModel),
    state: 'Regular',
    turnpoints,
    ssIndex,
    esIndex,
    goalType: mapGoalType(xcTask.goal?.type),
    startGates,
    taskDistance,
    speedSectionDistance,
    launchToEssDistance,
    legDistances,
    shortestRoute,
    qnhSetting: 1013.25,
    leadingTimeRatio: 0.26,
  };

  return task;
}

function mapTurnpointType(type: string): Turnpoint['type'] {
  const mapping: Record<string, Turnpoint['type']> = {
    'TAKEOFF': 'TAKEOFF',
    'SSS': 'SSS',
    'ESS': 'ESS',
    'GOAL': 'GOAL',
  };
  return mapping[type] || 'TURNPOINT';
}

function mapTaskType(type: string): TaskType {
  return type === 'ELAPSED_TIME' ? 'TimeTrial' : 'Race';
}

function mapGoalType(type?: string): GoalType {
  return type === 'CYLINDER' ? 'CYLINDER' : 'LINE';
}

function mapEarthModel(model: string): EarthModel {
  return model === 'FAI_SPHERE' ? 'FAI_SPHERE' : 'WGS84';
}
```

---

## Distance Calculations

```typescript
// src/main/scoring/geo/distance.ts

const DEG2RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Haversine distance between two points
 */
export function haversineDistance(p1: Coordinate, p2: Coordinate): number {
  const dLat = (p2.latitude - p1.latitude) * DEG2RAD;
  const dLon = (p2.longitude - p1.longitude) * DEG2RAD;

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.latitude * DEG2RAD) * Math.cos(p2.latitude * DEG2RAD) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * WGS84 Andoyer distance (more accurate)
 * Used by FS for official calculations
 */
export function distanceWgs84Andoyer(from: Coordinate, to: Coordinate): number {
  if (from.latitude === to.latitude && from.longitude === to.longitude) return 0;

  const lat1rad = from.latitude * DEG2RAD;
  const lat2rad = to.latitude * DEG2RAD;
  const dlon = (to.longitude - from.longitude) * DEG2RAD;

  const cosD = Math.sin(lat1rad) * Math.sin(lat2rad) +
               Math.cos(lat1rad) * Math.cos(lat2rad) * Math.cos(dlon);
  const d = Math.acos(Math.max(-1, Math.min(1, cosD)));

  // WGS84 parameters
  const f = 1 / 298.257223563;
  const a = 6378137;

  // Andoyer correction
  const sinD2 = Math.sin(d / 2);
  const cosD2 = Math.cos(d / 2);
  const F = (Math.sin(lat1rad) + Math.sin(lat2rad)) / 2;
  const G = (Math.sin(lat1rad) - Math.sin(lat2rad)) / 2;
  const H = (Math.cos(lat1rad) + Math.cos(lat2rad)) / 2;
  const L = (Math.cos(lat1rad) - Math.cos(lat2rad)) / 2;

  const S = sinD2 * sinD2 * H * H + cosD2 * cosD2 * G * G;
  const C = sinD2 * sinD2 * L * L + cosD2 * cosD2 * F * F;

  const omega = Math.atan2(Math.sqrt(S), Math.sqrt(C));
  const R = Math.sqrt(S * C) / omega;
  const D = 2 * omega * a;

  const T1 = (3 * R - 1) / (2 * C);
  const T2 = (3 * R + 1) / (2 * S);

  return D * (1 + f * (T1 * F * F * cosD2 * cosD2 - T2 * G * G * sinD2 * sinD2));
}
```

---

## Shortest Route Algorithm

```typescript
// src/main/scoring/geo/shortestRoute.ts

import type { Turnpoint, GeoPoint } from '../types';
import { haversineDistance } from './distance';

interface TaskDistances {
  shortestRoute: GeoPoint[];
  legDistances: number[];
  taskDistance: number;
  speedSectionDistance: number;
  launchToEssDistance: number;
}

/**
 * Calculate shortest route through turnpoint cylinders
 * Uses iterative optimization to find optimal entry/exit points
 */
export function calculateTaskDistances(
  turnpoints: Turnpoint[],
  ssIndex: number,
  esIndex: number
): TaskDistances {
  // Start with center-to-center route
  let route: GeoPoint[] = turnpoints.map(tp => ({
    latitude: tp.geopoint.latitude,
    longitude: tp.geopoint.longitude,
  }));

  // Optimize route through cylinders
  route = optimizeRoute(turnpoints, route);

  // Calculate leg distances
  const legDistances: number[] = [];
  for (let i = 1; i < route.length; i++) {
    legDistances.push(haversineDistance(route[i - 1], route[i]));
  }

  // Total task distance
  const taskDistance = legDistances.reduce((sum, d) => sum + d, 0);

  // Speed section distance (SS to ES)
  let speedSectionDistance = 0;
  for (let i = ssIndex; i < esIndex && i < legDistances.length; i++) {
    speedSectionDistance += legDistances[i];
  }

  // Launch to ESS distance
  let launchToEssDistance = 0;
  for (let i = 0; i < esIndex && i < legDistances.length; i++) {
    launchToEssDistance += legDistances[i];
  }

  return {
    shortestRoute: route,
    legDistances,
    taskDistance,
    speedSectionDistance,
    launchToEssDistance,
  };
}

/**
 * Iteratively optimize route points to minimize total distance
 */
function optimizeRoute(turnpoints: Turnpoint[], initialRoute: GeoPoint[]): GeoPoint[] {
  const route = [...initialRoute];
  const maxIterations = 100;
  const tolerance = 0.1; // meters

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    for (let i = 1; i < route.length - 1; i++) {
      const tp = turnpoints[i];
      const prev = route[i - 1];
      const next = route[i + 1];

      // Find optimal point on cylinder edge
      const optimal = findOptimalCylinderPoint(prev, next, tp);

      const dist = haversineDistance(route[i], optimal);
      if (dist > tolerance) {
        route[i] = optimal;
        changed = true;
      }
    }

    if (!changed) break;
  }

  return route;
}

/**
 * Find point on cylinder edge that minimizes path through prev -> point -> next
 */
function findOptimalCylinderPoint(
  prev: GeoPoint,
  next: GeoPoint,
  turnpoint: Turnpoint
): GeoPoint {
  const center = turnpoint.geopoint;
  const radius = turnpoint.radius;

  // Direction from prev to next
  const dx = next.longitude - prev.longitude;
  const dy = next.latitude - prev.latitude;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) {
    // prev and next are same, return point towards center
    return {
      latitude: center.latitude,
      longitude: center.longitude,
    };
  }

  // Perpendicular from center to line
  const t = ((center.longitude - prev.longitude) * dx +
             (center.latitude - prev.latitude) * dy) / (len * len);

  const closestOnLine = {
    longitude: prev.longitude + t * dx,
    latitude: prev.latitude + t * dy,
  };

  // Direction from center to closest point on line
  const toCenterX = closestOnLine.longitude - center.longitude;
  const toCenterY = closestOnLine.latitude - center.latitude;
  const distToCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);

  if (distToCenter === 0) {
    // Line passes through center
    return {
      latitude: center.latitude + (dy / len) * metersToLat(radius),
      longitude: center.longitude + (dx / len) * metersToLon(radius, center.latitude),
    };
  }

  // Point on cylinder towards line
  return {
    latitude: center.latitude + (toCenterY / distToCenter) * metersToLat(radius),
    longitude: center.longitude + (toCenterX / distToCenter) * metersToLon(radius, center.latitude),
  };
}

function metersToLat(meters: number): number {
  return meters / 111111;
}

function metersToLon(meters: number, lat: number): number {
  return meters / (111111 * Math.cos(lat * Math.PI / 180));
}
```

---

## UI Components

### Import Dialog

```typescript
// src/renderer/components/task/ImportXctskDialog.tsx

import React, { useState } from 'react';
import { useCompetition } from '../../context/competitionContext';
import Card from '../layout/Card';
import WaypointTable from './WaypointTable';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ImportXctskDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { addTask } = useCompetition();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectFile = async () => {
    try {
      setIsLoading(true);
      const filePath = await window.scoring.selectFile('xctsk');
      const parsedTask = await window.scoring.importXctsk(filePath);
      setTask(parsedTask);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (task) {
      await addTask(task);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <Card title="Import XCTrack Task" className="w-[600px]">
        <div className="space-y-4">
          <button onClick={handleSelectFile} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Select .xctsk File'}
          </button>

          {task && (
            <>
              <div className="text-lg font-bold">{task.name}</div>
              <div>Distance: {(task.taskDistance / 1000).toFixed(1)} km</div>
              <WaypointTable turnpoints={task.turnpoints} />
            </>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose}>Cancel</button>
            <button onClick={handleImport} disabled={!task}>Import</button>
          </div>
        </div>
      </Card>
    </div>
  );
};
```

### Waypoint Table

```typescript
// src/renderer/components/task/WaypointTable.tsx

import React from 'react';
import type { Turnpoint } from '../../../main/scoring/types';

interface Props {
  turnpoints: Turnpoint[];
}

const WaypointTable: React.FC<Props> = ({ turnpoints }) => {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">#</th>
          <th className="p-2 text-left">Name</th>
          <th className="p-2 text-left">Type</th>
          <th className="p-2 text-right">Radius</th>
          <th className="p-2 text-right">Altitude</th>
        </tr>
      </thead>
      <tbody>
        {turnpoints.map((tp, index) => (
          <tr key={tp.id} className="border-b">
            <td className="p-2">{index + 1}</td>
            <td className="p-2">{tp.geopoint.name || tp.id}</td>
            <td className="p-2">{tp.type}</td>
            <td className="p-2 text-right">{tp.radius}m</td>
            <td className="p-2 text-right">{tp.altitude}m</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## Validation Checklist

- [ ] .xctsk files parse correctly
- [ ] Turnpoint types map correctly
- [ ] Distance calculations match FS within 0.1%
- [ ] UI displays task information correctly

## Next Phase

[Phase 3: Flight Analysis](./phase-3-flight-analysis.md) - Analyze IGC tracks against tasks
