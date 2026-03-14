import React, { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Turnpoint,
  GeoPoint,
  TurnpointType,
  FlightFix,
} from "@main/scoring/types";
import { createCirclePolygon } from "@renderer/utils/geoCircle";
import { segmentTrack } from "@renderer/utils/trackSegmentation";
import { MAPTILER_STYLE_URL } from "@renderer/config/mapConfig";

const CYLINDER_COLORS: Record<TurnpointType, { fill: string; stroke: string }> =
  {
    TAKEOFF: {
      fill: "rgba(59, 130, 246, 0.15)",
      stroke: "rgba(59, 130, 246, 0.8)",
    },
    SSS: {
      fill: "rgba(34, 197, 94, 0.15)",
      stroke: "rgba(34, 197, 94, 0.8)",
    },
    TURNPOINT: {
      fill: "rgba(107, 114, 128, 0.15)",
      stroke: "rgba(107, 114, 128, 0.8)",
    },
    ESS: {
      fill: "rgba(249, 115, 22, 0.15)",
      stroke: "rgba(249, 115, 22, 0.8)",
    },
    GOAL: {
      fill: "rgba(239, 68, 68, 0.15)",
      stroke: "rgba(239, 68, 68, 0.8)",
    },
  };

export const TRACK_COLORS = [
  "#dc2626", // red
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#9333ea", // purple
  "#0891b2", // cyan
];

export interface TrackLayer {
  label: string;
  fixes: FlightFix[];
  color?: string;
}

interface TaskMapProps {
  turnpoints: Turnpoint[];
  shortestRoute: GeoPoint[];
  trackFixes?: FlightFix[];
  tracks?: TrackLayer[];
}

const TaskMap: React.FC<TaskMapProps> = ({
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
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Add turnpoint cylinders grouped by type
      const types = Object.keys(CYLINDER_COLORS) as TurnpointType[];
      for (const type of types) {
        const tps = turnpoints.filter((tp) => tp.type === type);
        if (tps.length === 0) continue;

        const features = tps.map((tp) =>
          createCirclePolygon(
            tp.geopoint.latitude,
            tp.geopoint.longitude,
            tp.radius
          )
        );

        const sourceId = `cylinders-${type}`;
        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features,
          },
        });

        map.addLayer({
          id: `${sourceId}-fill`,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": CYLINDER_COLORS[type].fill,
          },
        });

        map.addLayer({
          id: `${sourceId}-stroke`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": CYLINDER_COLORS[type].stroke,
            "line-width": 2,
          },
        });
      }

      // Add shortest route line
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

      // Add turnpoint label markers
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
        data: {
          type: "FeatureCollection",
          features: labelFeatures,
        },
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

      // Add small circle markers at turnpoint centers
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

      // Add track layers with grey before-SS / after-goal segments
      const INACTIVE_COLOR = "#434646";
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

      for (let i = 0; i < allTracks.length; i++) {
        const { fixes, color } = allTracks[i];
        const segments = segmentTrack(fixes, turnpoints);
        const segDefs = [
          { key: "before", fixes: segments.beforeSS, color: INACTIVE_COLOR },
          { key: "race", fixes: segments.racing, color },
          { key: "after", fixes: segments.afterGoal, color: INACTIVE_COLOR },
        ];
        for (const seg of segDefs) {
          if (seg.fixes.length < 2) continue;
          const srcId = `track-${i}-${seg.key}`;
          map.addSource(srcId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: seg.fixes.map((f) => [f.longitude, f.latitude]),
              },
            },
          });
          map.addLayer({
            id: `${srcId}-line`,
            type: "line",
            source: srcId,
            paint: {
              "line-color": seg.color,
              "line-width": 2,
              "line-opacity": 0.8,
            },
          });
        }
      }

      // Fit bounds to all turnpoints
      if (turnpoints.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const tp of turnpoints) {
          bounds.extend([tp.geopoint.longitude, tp.geopoint.latitude]);
        }
        map.fitBounds(bounds, { padding: 50 });
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
      className="w-full h-96 rounded-lg overflow-hidden"
    />
  );
};

export default TaskMap;
