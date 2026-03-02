/**
 * Geodetic constants for distance and coordinate calculations
 */

// WGS84 ellipsoid parameters
export const WGS84_RADIUS_A = 6378137; // Semi-major axis (equatorial radius) in meters
export const WGS84_RADIUS_B = 6356752.314245; // Semi-minor axis (polar radius) in meters
export const WGS84_FLATTENING = 1 / 298.257223563; // Flattening factor

// FAI sphere (used for simplified calculations)
export const FAI_SPHERE_RADIUS = 6371000; // Standard Earth radius in meters

// Conversion constants
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

// Precision constants
export const METERS_PER_DEG_LAT = 111111; // Approximate meters per degree latitude
export const DEFAULT_TOLERANCE = 0.1; // Default convergence tolerance in meters
export const MAX_ITERATIONS = 100; // Maximum iterations for optimization algorithms
