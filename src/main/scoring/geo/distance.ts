/**
 * Distance calculation methods for geodetic coordinates
 *
 * Ported from FS C# implementation (FsGeo/GeoUtil.cs)
 */

import {
  WGS84_RADIUS_A,
  WGS84_FLATTENING,
  FAI_SPHERE_RADIUS,
  DEG2RAD,
} from "./constants";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two points using WGS84 Andoyer method
 * This is the default method used by FS for competition scoring
 *
 * Fast and accurate enough for paragliding/hang gliding distances
 * Accuracy: ~0.01% error at distances < 100km
 *
 * @param from Starting coordinate
 * @param to Ending coordinate
 * @returns Distance in meters
 */
export function distanceWgs84Andoyer(from: Coordinate, to: Coordinate): number {
  if (from.latitude === to.latitude && from.longitude === to.longitude) {
    return 0;
  }

  const lat1rad = from.latitude * DEG2RAD;
  const lat2rad = to.latitude * DEG2RAD;
  const dlon = (to.longitude - from.longitude) * DEG2RAD;

  const cosLat1 = Math.cos(lat1rad);
  const cosLat2 = Math.cos(lat2rad);
  const sinLat1 = Math.sin(lat1rad);
  const sinLat2 = Math.sin(lat2rad);
  const cosDlon = Math.cos(dlon);

  // Central angle using spherical law of cosines
  let cosD = sinLat1 * sinLat2 + cosLat1 * cosLat2 * cosDlon;

  // Clamp to valid range to avoid NaN from acos
  if (cosD < -1.0) cosD = -1.0;
  if (cosD > 1.0) cosD = 1.0;

  const d = Math.acos(cosD); // Central angle in radians
  const sinD = Math.sin(d);

  if (sinD === 0) {
    return 0;
  }

  // Andoyer correction for WGS84 ellipsoid
  const diffSinLat = sinLat1 - sinLat2;
  const sumSinLat = sinLat1 + sinLat2;
  const K = diffSinLat * diffSinLat;
  const L = sumSinLat * sumSinLat;
  const threeSinD = 3.0 * sinD;

  const oneMinusCosD = 1.0 - cosD;
  const onePlusCosD = 1.0 + cosD;

  const H = oneMinusCosD === 0 ? 0 : (d + threeSinD) / oneMinusCosD;
  const G = onePlusCosD === 0 ? 0 : (d - threeSinD) / onePlusCosD;

  // Ellipsoid flattening correction
  const dd = -(WGS84_FLATTENING / 4.0) * (H * K + G * L);

  return WGS84_RADIUS_A * (d + dd);
}

/**
 * Calculate distance using simple Haversine formula (spherical Earth)
 *
 * Faster but less accurate than Andoyer
 * Uses FAI sphere radius (6371000m)
 *
 * @param from Starting coordinate
 * @param to Ending coordinate
 * @returns Distance in meters
 */
export function distanceHaversine(from: Coordinate, to: Coordinate): number {
  if (from.latitude === to.latitude && from.longitude === to.longitude) {
    return 0;
  }

  const dLat = (to.latitude - from.latitude) * DEG2RAD;
  const dLon = (to.longitude - from.longitude) * DEG2RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.latitude * DEG2RAD) *
      Math.cos(to.latitude * DEG2RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return FAI_SPHERE_RADIUS * c;
}

/**
 * Calculate distance using Vincenty formula (most accurate)
 *
 * Iterative algorithm that accounts for Earth's ellipsoid shape
 * More computationally expensive, use when maximum accuracy is required
 *
 * @param from Starting coordinate
 * @param to Ending coordinate
 * @param lambdaTol Convergence tolerance (default 1e-12)
 * @param maxIter Maximum iterations (default 100)
 * @returns Distance in meters
 */
export function distanceWgs84Vincenty(
  from: Coordinate,
  to: Coordinate,
  lambdaTol = 1e-12,
  maxIter = 100
): number {
  if (from.latitude === to.latitude && from.longitude === to.longitude) {
    return 0;
  }

  const f = WGS84_FLATTENING;
  const a = WGS84_RADIUS_A;
  const b = a * (1 - f);

  const L = (to.longitude - from.longitude) * DEG2RAD;
  let lambda = L;

  const tanU1 = (1 - f) * Math.tan(from.latitude * DEG2RAD);
  const cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1);
  const sinU1 = tanU1 * cosU1;

  const tanU2 = (1 - f) * Math.tan(to.latitude * DEG2RAD);
  const cosU2 = 1 / Math.sqrt(1 + tanU2 * tanU2);
  const sinU2 = tanU2 * cosU2;

  let sinLambda: number,
    cosLambda: number,
    sinSigma: number,
    cosSigma: number,
    sigma: number,
    sinAlpha: number,
    cosAlphaSq: number,
    cos2SigmaM: number;

  let lambdaP: number;
  let iter = 0;

  do {
    sinLambda = Math.sin(lambda);
    cosLambda = Math.cos(lambda);

    sinSigma = Math.sqrt(
      cosU2 * sinLambda * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
          (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
    );

    if (sinSigma === 0) return 0; // Co-incident points

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);

    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosAlphaSq = 1 - sinAlpha * sinAlpha;

    cos2SigmaM =
      cosAlphaSq !== 0 ? cosSigma - (2 * sinU1 * sinU2) / cosAlphaSq : 0;

    const C = (f / 16) * cosAlphaSq * (4 + f * (4 - 3 * cosAlphaSq));

    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        f *
        sinAlpha *
        (sigma +
          C *
            sinSigma *
            (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));

    iter++;
  } while (Math.abs(lambda - lambdaP) > lambdaTol && iter < maxIter);

  if (iter >= maxIter) {
    // Failed to converge, fall back to Andoyer
    return distanceWgs84Andoyer(from, to);
  }

  const uSq = (cosAlphaSq * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (B / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma * sinSigma) *
            (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  return b * A * (sigma - deltaSigma);
}

/**
 * Default distance calculation (uses Andoyer method)
 *
 * @param from Starting coordinate
 * @param to Ending coordinate
 * @returns Distance in meters
 */
export function distance(from: Coordinate, to: Coordinate): number {
  return distanceWgs84Andoyer(from, to);
}

/**
 * Calculate bearing from one point to another
 *
 * @param from Starting coordinate
 * @param to Ending coordinate
 * @returns Bearing in degrees (0-360, clockwise from north)
 */
export function bearing(from: Coordinate, to: Coordinate): number {
  const lat1 = from.latitude * DEG2RAD;
  const lat2 = to.latitude * DEG2RAD;
  const dLon = (to.longitude - from.longitude) * DEG2RAD;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let brng = Math.atan2(y, x) * (180 / Math.PI);
  brng = ((brng % 360) + 360) % 360; // Normalize to 0-360

  return brng;
}

/**
 * Calculate destination point given start, bearing, and distance
 *
 * @param from Starting coordinate
 * @param bearingDeg Bearing in degrees
 * @param distanceM Distance in meters
 * @returns Destination coordinate
 */
export function destination(
  from: Coordinate,
  bearingDeg: number,
  distanceM: number
): Coordinate {
  const lat1 = from.latitude * DEG2RAD;
  const lon1 = from.longitude * DEG2RAD;
  const brng = bearingDeg * DEG2RAD;
  const angularDistance = distanceM / FAI_SPHERE_RADIUS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(brng)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: lat2 * (180 / Math.PI),
    longitude: lon2 * (180 / Math.PI),
  };
}

/**
 * WGS84 meters per degree latitude at a given latitude (radians).
 * Series expansion accurate to ~1m.
 */
export function metersPerDegreeLat(latRad: number): number {
  return (
    111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad)
  );
}

/**
 * WGS84 meters per degree longitude at a given latitude (radians).
 * Series expansion accurate to ~1m.
 */
export function metersPerDegreeLon(latRad: number): number {
  return 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);
}

/**
 * Convert meters to approximate degrees latitude
 */
export function metersToLatDeg(meters: number, latitudeDeg?: number): number {
  if (latitudeDeg !== undefined) {
    return meters / metersPerDegreeLat(latitudeDeg * DEG2RAD);
  }
  return meters / 111111;
}

/**
 * Convert meters to approximate degrees longitude at a given latitude
 */
export function metersToLonDeg(meters: number, latitude: number): number {
  return meters / metersPerDegreeLon(latitude * DEG2RAD);
}
