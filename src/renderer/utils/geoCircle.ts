import type { Feature, Polygon } from "geojson";

export function createCirclePolygon(
  centerLat: number,
  centerLon: number,
  radiusMeters: number,
  numPoints = 64
): Feature<Polygon> {
  const coords: [number, number][] = [];
  const earthRadius = 6371008.8;

  for (let i = 0; i <= numPoints; i++) {
    const bearing = (i * 360) / numPoints;
    const bearingRad = (bearing * Math.PI) / 180;
    const latRad = (centerLat * Math.PI) / 180;
    const lonRad = (centerLon * Math.PI) / 180;
    const angularDist = radiusMeters / earthRadius;

    const destLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDist) +
        Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearingRad)
    );
    const destLon =
      lonRad +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDist) * Math.cos(latRad),
        Math.cos(angularDist) - Math.sin(latRad) * Math.sin(destLat)
      );

    coords.push([(destLon * 180) / Math.PI, (destLat * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}
