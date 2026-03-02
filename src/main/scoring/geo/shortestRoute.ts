/**
 * Shortest route calculation through task cylinders
 *
 * Ported from FS C# implementation (FsFsdb/FsTaskDefinition.cs)
 *
 * The algorithm iteratively optimizes the path through turnpoint cylinders
 * to find the shortest valid route.
 */

import type { GeoPoint, Turnpoint } from "../types";
import { distance, metersToLatDeg, metersToLonDeg } from "./distance";
import { DEFAULT_TOLERANCE, MAX_ITERATIONS, DEG2RAD } from "./constants";

/**
 * Result of task distance calculations
 */
export interface TaskDistances {
  shortestRoute: GeoPoint[];
  legDistances: number[];
  taskDistance: number;
  speedSectionDistance: number;
  launchToEssDistance: number;
}

/**
 * Calculate all task distances including shortest route optimization
 *
 * @param turnpoints Array of task turnpoints
 * @param ssIndex 1-based index of speed section start
 * @param esIndex 1-based index of end of speed section
 * @returns TaskDistances object with route and all distances
 */
export function calculateTaskDistances(
  turnpoints: Turnpoint[],
  ssIndex: number,
  esIndex: number
): TaskDistances {
  if (turnpoints.length < 2) {
    return {
      shortestRoute: [],
      legDistances: [],
      taskDistance: 0,
      speedSectionDistance: 0,
      launchToEssDistance: 0,
    };
  }

  // Start with center-to-center route
  let route: GeoPoint[] = turnpoints.map((tp) => ({
    latitude: tp.geopoint.latitude,
    longitude: tp.geopoint.longitude,
    altitude: tp.geopoint.altitude,
    name: tp.geopoint.name,
  }));

  // Optimize route through cylinders (skip first and last points)
  route = optimizeRoute(turnpoints, route);

  // Calculate leg distances
  const legDistances: number[] = [];
  for (let i = 1; i < route.length; i++) {
    legDistances.push(distance(route[i - 1], route[i]));
  }

  // Total task distance
  const taskDistance = legDistances.reduce((sum, d) => sum + d, 0);

  // Speed section distance (from SS to ES)
  // ssIndex and esIndex are 1-based, so legs from ssIndex-1 to esIndex-1
  let speedSectionDistance = 0;
  for (let i = ssIndex - 1; i < esIndex - 1 && i < legDistances.length; i++) {
    speedSectionDistance += legDistances[i];
  }

  // Launch to ESS distance (from start to ES)
  let launchToEssDistance = 0;
  for (let i = 0; i < esIndex - 1 && i < legDistances.length; i++) {
    launchToEssDistance += legDistances[i];
  }

  return {
    shortestRoute: route,
    legDistances,
    taskDistance: Math.round(taskDistance),
    speedSectionDistance: Math.round(speedSectionDistance),
    launchToEssDistance: Math.round(launchToEssDistance),
  };
}

/**
 * Iteratively optimize route points to minimize total distance
 *
 * For each intermediate waypoint, finds the optimal point on the cylinder
 * boundary that minimizes the path through that waypoint.
 *
 * @param turnpoints Original turnpoints with radii
 * @param initialRoute Initial route (typically center points)
 * @returns Optimized route
 */
export function optimizeRoute(
  turnpoints: Turnpoint[],
  initialRoute: GeoPoint[]
): GeoPoint[] {
  const route = initialRoute.map((p) => ({ ...p }));

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let maxChange = 0;

    // Optimize each intermediate point (skip first and last)
    for (let i = 1; i < route.length - 1; i++) {
      const tp = turnpoints[i];
      const prev = route[i - 1];
      const next = route[i + 1];

      // Find optimal point on cylinder edge
      const optimal = findOptimalCylinderPoint(prev, next, tp);

      // Calculate change
      const change = distance(route[i], optimal);
      if (change > maxChange) {
        maxChange = change;
      }

      // Update point
      route[i] = optimal;
    }

    // Check convergence
    if (maxChange < DEFAULT_TOLERANCE) {
      break;
    }
  }

  return route;
}

/**
 * Find the point on a turnpoint cylinder that minimizes path length
 *
 * This finds the point P on the cylinder boundary such that
 * distance(prev, P) + distance(P, next) is minimized.
 *
 * @param prev Previous waypoint
 * @param next Next waypoint
 * @param turnpoint Turnpoint with cylinder radius
 * @returns Optimal point on cylinder boundary
 */
export function findOptimalCylinderPoint(
  prev: GeoPoint,
  next: GeoPoint,
  turnpoint: Turnpoint
): GeoPoint {
  const center = turnpoint.geopoint;
  const radius = turnpoint.radius;

  // Check if radius is zero (point turnpoint)
  if (radius <= 0) {
    return {
      latitude: center.latitude,
      longitude: center.longitude,
      altitude: center.altitude,
      name: center.name,
    };
  }

  // Convert to local planar coordinates for geometric calculations
  // Using center as origin
  const cosLat = Math.cos(center.latitude * DEG2RAD);

  const prevX = (prev.longitude - center.longitude) * 111111 * cosLat;
  const prevY = (prev.latitude - center.latitude) * 111111;

  const nextX = (next.longitude - center.longitude) * 111111 * cosLat;
  const nextY = (next.latitude - center.latitude) * 111111;

  // Check if prev and next are the same point
  const dx = nextX - prevX;
  const dy = nextY - prevY;
  const lineLen = Math.sqrt(dx * dx + dy * dy);

  if (lineLen < 0.001) {
    // Points are essentially the same, use perpendicular from center
    return projectPointOnCylinder(center, prev, radius);
  }

  // Find closest point on line from prev to next
  const t = (-prevX * dx + -prevY * dy) / (lineLen * lineLen);

  // Closest point on line to center (at origin)
  const closestX = prevX + t * dx;
  const closestY = prevY + t * dy;
  const distToLine = Math.sqrt(closestX * closestX + closestY * closestY);

  let optimalX: number;
  let optimalY: number;

  if (distToLine < 0.001) {
    // Line passes through center, use perpendicular direction
    const perpX = -dy / lineLen;
    const perpY = dx / lineLen;
    optimalX = perpX * radius;
    optimalY = perpY * radius;
  } else if (distToLine <= radius) {
    // Line intersects or touches cylinder
    // Find intersection points and choose the one that minimizes total distance
    const intersections = findLineCircleIntersections(
      prevX,
      prevY,
      nextX,
      nextY,
      radius
    );

    if (intersections.length === 0) {
      // Fallback: project closest point
      optimalX = (closestX / distToLine) * radius;
      optimalY = (closestY / distToLine) * radius;
    } else if (intersections.length === 1) {
      optimalX = intersections[0].x;
      optimalY = intersections[0].y;
    } else {
      // Choose intersection that minimizes total path length
      const d1 =
        Math.sqrt(
          (intersections[0].x - prevX) ** 2 + (intersections[0].y - prevY) ** 2
        ) +
        Math.sqrt(
          (intersections[0].x - nextX) ** 2 + (intersections[0].y - nextY) ** 2
        );
      const d2 =
        Math.sqrt(
          (intersections[1].x - prevX) ** 2 + (intersections[1].y - prevY) ** 2
        ) +
        Math.sqrt(
          (intersections[1].x - nextX) ** 2 + (intersections[1].y - nextY) ** 2
        );

      if (d1 <= d2) {
        optimalX = intersections[0].x;
        optimalY = intersections[0].y;
      } else {
        optimalX = intersections[1].x;
        optimalY = intersections[1].y;
      }
    }
  } else {
    // Line doesn't reach cylinder
    // Find point on cylinder between center and the closest point on line
    optimalX = (closestX / distToLine) * radius;
    optimalY = (closestY / distToLine) * radius;
  }

  // Convert back to geographic coordinates
  return {
    latitude: center.latitude + metersToLatDeg(optimalY),
    longitude: center.longitude + metersToLonDeg(optimalX, center.latitude),
    altitude: center.altitude,
    name: center.name,
  };
}

/**
 * Find intersections of a line segment with a circle centered at origin
 */
function findLineCircleIntersections(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number
): Array<{ x: number; y: number }> {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const a = dx * dx + dy * dy;
  const b = 2 * (x1 * dx + y1 * dy);
  const c = x1 * x1 + y1 * y1 - radius * radius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return [];
  }

  const results: Array<{ x: number; y: number }> = [];
  const sqrtDiscriminant = Math.sqrt(discriminant);

  const t1 = (-b - sqrtDiscriminant) / (2 * a);
  const t2 = (-b + sqrtDiscriminant) / (2 * a);

  // Only include intersections within the line segment extended reasonably
  // We're looking for points on the cylinder, not strictly on segment
  if (t1 >= -0.5 && t1 <= 1.5) {
    results.push({
      x: x1 + t1 * dx,
      y: y1 + t1 * dy,
    });
  }

  if (discriminant > 0 && t2 >= -0.5 && t2 <= 1.5) {
    results.push({
      x: x1 + t2 * dx,
      y: y1 + t2 * dy,
    });
  }

  return results;
}

/**
 * Project a point onto a cylinder boundary
 */
function projectPointOnCylinder(
  center: GeoPoint,
  point: GeoPoint,
  radius: number
): GeoPoint {
  const cosLat = Math.cos(center.latitude * DEG2RAD);

  const dx = (point.longitude - center.longitude) * 111111 * cosLat;
  const dy = (point.latitude - center.latitude) * 111111;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.001) {
    // Point is at center, return point to the north
    return {
      latitude: center.latitude + metersToLatDeg(radius),
      longitude: center.longitude,
      altitude: center.altitude,
      name: center.name,
    };
  }

  return {
    latitude: center.latitude + metersToLatDeg((dy / dist) * radius),
    longitude:
      center.longitude + metersToLonDeg((dx / dist) * radius, center.latitude),
    altitude: center.altitude,
    name: center.name,
  };
}

/**
 * Calculate cumulative leg distances from a specific index
 *
 * @param route Array of route points
 * @param startIndex Index to start accumulating from
 * @returns Array of cumulative distances
 */
export function calculateCumulativeDistances(
  route: GeoPoint[],
  startIndex = 0
): number[] {
  const cumulative: number[] = [0];
  let total = 0;

  for (let i = Math.max(1, startIndex); i < route.length; i++) {
    total += distance(route[i - 1], route[i]);
    cumulative.push(total);
  }

  return cumulative;
}
