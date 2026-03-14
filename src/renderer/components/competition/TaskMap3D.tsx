import React, { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as THREE from "three";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — module resolution mismatch, works at runtime via webpack
import { Line2 } from "three/examples/jsm/lines/Line2.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import type {
  Turnpoint,
  GeoPoint,
  TurnpointType,
  FlightFix,
} from "@main/scoring/types";
import {
  segmentTrack,
  type TrackSegments,
} from "@renderer/utils/trackSegmentation";
import {
  MAPTILER_API_KEY,
  MAPTILER_STYLE_URL,
} from "@renderer/config/mapConfig";
import type { TrackLayer } from "./TaskMap";
import { TRACK_COLORS } from "./TaskMap";

const CYLINDER_HEX: Record<TurnpointType, number> = {
  TAKEOFF: 0x3b82f6,
  SSS: 0x22c55e,
  TURNPOINT: 0x6b7280,
  ESS: 0xf97316,
  GOAL: 0xef4444,
};

/** Create a Line2 from flight fixes positioned relative to origin */
function buildLine2(
  fixes: FlightFix[],
  color: string,
  originMerc: maplibregl.MercatorCoordinate,
  scale: number
): Line2 | null {
  const valid = fixes.filter((f) => f.valid && f.gpsAltitude != null);
  if (valid.length < 2) return null;

  const positions: number[] = [];
  for (const fix of valid) {
    const merc = maplibregl.MercatorCoordinate.fromLngLat(
      [fix.longitude, fix.latitude],
      fix.gpsAltitude ?? 0
    );
    positions.push(
      (merc.x - originMerc.x) / scale,
      (merc.y - originMerc.y) / scale,
      (merc.z! - originMerc.z!) / scale
    );
  }

  const geometry = new LineGeometry();
  geometry.setPositions(positions);

  const material = new LineMaterial({
    color: new THREE.Color(color).getHex(),
    linewidth: 3,
    worldUnits: false,
  });

  const line = new Line2(geometry, material);
  line.computeLineDistances();
  return line;
}

/** Build a single MapLibre custom 3D layer containing all tracks and cylinders */
function create3DSceneLayer(
  layerId: string,
  trackData: { segments: TrackSegments; color: string }[],
  turnpoints: Turnpoint[],
  maxTrackAlt: number,
  originFix: FlightFix,
  _map: maplibregl.Map
): maplibregl.CustomLayerInterface {
  const originMerc = maplibregl.MercatorCoordinate.fromLngLat(
    [originFix.longitude, originFix.latitude],
    originFix.gpsAltitude ?? 0
  );
  const scale = originMerc.meterInMercatorCoordinateUnits();

  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.Camera;

  return {
    id: layerId,
    type: "custom" as const,
    renderingMode: "3d" as const,

    onAdd(_map: maplibregl.Map, gl: WebGL2RenderingContext) {
      camera = new THREE.Camera();
      scene = new THREE.Scene();

      // Track segments as Line2 objects (grey for inactive, colored for racing)
      const INACTIVE_COLOR = "#434646";
      for (const { segments, color } of trackData) {
        const segDefs = [
          { fixes: segments.beforeSS, segColor: INACTIVE_COLOR },
          { fixes: segments.racing, segColor: color },
          { fixes: segments.afterGoal, segColor: INACTIVE_COLOR },
        ];
        for (const { fixes, segColor } of segDefs) {
          const line = buildLine2(fixes, segColor, originMerc, scale);
          if (line) scene.add(line);
        }
      }

      // 3D turnpoint cylinders
      const cylinderTop = maxTrackAlt + 500;
      for (const tp of turnpoints) {
        const tpMerc = maplibregl.MercatorCoordinate.fromLngLat(
          [tp.geopoint.longitude, tp.geopoint.latitude],
          tp.altitude
        );
        const topMerc = maplibregl.MercatorCoordinate.fromLngLat(
          [tp.geopoint.longitude, tp.geopoint.latitude],
          cylinderTop
        );

        const cx = (tpMerc.x - originMerc.x) / scale;
        const cy = (tpMerc.y - originMerc.y) / scale;
        const bottomZ = (tpMerc.z! - originMerc.z!) / scale;
        const topZ = (topMerc.z! - originMerc.z!) / scale;
        const height = Math.abs(topZ - bottomZ);
        const midZ = (bottomZ + topZ) / 2;
        const radius = tp.radius;
        const hexColor = CYLINDER_HEX[tp.type];

        // Translucent cylinder mesh
        const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 32);
        cylGeo.rotateX(Math.PI / 2); // align with Z axis
        const cylMat = new THREE.MeshBasicMaterial({
          color: hexColor,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const cylMesh = new THREE.Mesh(cylGeo, cylMat);
        cylMesh.position.set(cx, cy, midZ);
        scene.add(cylMesh);

        // Top and bottom stroke rings
        for (const ringZ of [bottomZ, topZ]) {
          const ringVerts: THREE.Vector3[] = [];
          for (let j = 0; j <= 32; j++) {
            const angle = (j / 32) * Math.PI * 2;
            ringVerts.push(
              new THREE.Vector3(
                cx + Math.cos(angle) * radius,
                cy + Math.sin(angle) * radius,
                ringZ
              )
            );
          }
          const ringGeo = new THREE.BufferGeometry().setFromPoints(ringVerts);
          const ringMat = new THREE.LineBasicMaterial({
            color: hexColor,
            transparent: true,
            opacity: 0.8,
          });
          scene.add(new THREE.LineLoop(ringGeo, ringMat));
        }
      }

      renderer = new THREE.WebGLRenderer({
        canvas: _map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
    },

    render(
      _gl: WebGL2RenderingContext,
      args: maplibregl.CustomRenderMethodInput
    ) {
      const m = new THREE.Matrix4().fromArray(
        args.defaultProjectionData.mainMatrix
      );
      const l = new THREE.Matrix4()
        .makeTranslation(originMerc.x, originMerc.y, originMerc.z!)
        .scale(new THREE.Vector3(scale, scale, scale));

      camera.projectionMatrix = m.multiply(l);

      renderer.resetState();
      renderer.render(scene, camera);
    },
  };
}

interface TaskMap3DProps {
  turnpoints: Turnpoint[];
  shortestRoute: GeoPoint[];
  trackFixes?: FlightFix[];
  tracks?: TrackLayer[];
}

const TaskMap3D: React.FC<TaskMap3DProps> = ({
  turnpoints,
  shortestRoute,
  trackFixes,
  tracks,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAPTILER_STYLE_URL,
      center: [0, 0],
      zoom: 2,
      pitch: 75,
      bearing: -20,
      maxPitch: 85,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // 3D terrain
      map.addSource("terrain-dem", {
        type: "raster-dem",
        url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_API_KEY}`,
      });
      map.setTerrain({ source: "terrain-dem", exaggeration: 1.2 });

      map.setSky({
        "sky-color": "#88C6FC",
        "sky-horizon-blend": 0.5,
      });

      // Shortest route line
      if (shortestRoute.length > 1) {
        map.addSource("shortest-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: shortestRoute.map((p) => [p.longitude, p.latitude]),
            },
          },
        });

        map.addLayer({
          id: "shortest-route-line",
          type: "line",
          source: "shortest-route",
          paint: {
            "line-color": "#1e40af",
            "line-width": 2,
            "line-dasharray": [4, 3],
          },
        });
      }

      // Turnpoint labels + dots (MapLibre layers — drape on terrain)
      const labelFeatures = turnpoints.map((tp, i) => ({
        type: "Feature" as const,
        properties: {
          name: tp.geopoint.name || `TP${i + 1}`,
          type: tp.type,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [tp.geopoint.longitude, tp.geopoint.latitude],
        },
      }));

      map.addSource("turnpoint-labels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: labelFeatures },
      });

      map.addLayer({
        id: "turnpoint-labels",
        type: "symbol",
        source: "turnpoint-labels",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#1f2937",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      map.addLayer({
        id: "turnpoint-dots",
        type: "circle",
        source: "turnpoint-labels",
        paint: {
          "circle-radius": 4,
          "circle-color": "#1f2937",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      // Build track data
      const allTracks: { fixes: FlightFix[]; color: string }[] = [];
      if (tracks && tracks.length > 0) {
        tracks.forEach((track, i) => {
          const validFixes = track.fixes.filter((f) => f.valid);
          if (validFixes.length >= 2) {
            allTracks.push({
              fixes: validFixes,
              color: track.color || TRACK_COLORS[i % TRACK_COLORS.length],
            });
          }
        });
      } else if (trackFixes && trackFixes.length > 0) {
        const validFixes = trackFixes.filter((f) => f.valid);
        if (validFixes.length >= 2) {
          allTracks.push({ fixes: validFixes, color: "#dc2626" });
        }
      }

      if (allTracks.length > 0) {
        // Origin fix + max altitude across all tracks
        const originFix = allTracks[0].fixes.find(
          (f) => f.gpsAltitude != null
        )!;
        let maxAlt = 0;
        for (const t of allTracks) {
          for (const f of t.fixes) {
            if (f.gpsAltitude != null && f.gpsAltitude > maxAlt)
              maxAlt = f.gpsAltitude;
          }
        }

        // Segment each track
        const trackData = allTracks.map(({ fixes, color }) => ({
          segments: segmentTrack(fixes, turnpoints),
          color,
        }));

        // Combined 3D scene: tracks + cylinders
        const layer = create3DSceneLayer(
          "scene-3d",
          trackData,
          turnpoints,
          maxAlt,
          originFix,
          map
        );
        map.addLayer(layer);
      }

      // Fit bounds
      if (turnpoints.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const tp of turnpoints) {
          bounds.extend([tp.geopoint.longitude, tp.geopoint.latitude]);
        }
        map.fitBounds(bounds, { padding: 50, pitch: 75, bearing: -20 });
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [turnpoints, shortestRoute, trackFixes, tracks]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[32rem] rounded-lg overflow-hidden"
    />
  );
};

export default TaskMap3D;
