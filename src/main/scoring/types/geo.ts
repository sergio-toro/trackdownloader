/**
 * Geographic types for coordinates and areas
 */

/**
 * Geographic point with optional altitude and name
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  name?: string;
}

/**
 * Simple coordinate (lat/lon only)
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Coordinate with altitude
 */
export interface Coordinate3D extends Coordinate {
  altitude: number;
}

/**
 * Rectangular bounding box
 */
export interface RectangularArea {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}
