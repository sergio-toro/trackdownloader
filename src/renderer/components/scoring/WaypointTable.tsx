/**
 * Waypoint/Turnpoint table component
 * Displays turnpoint list for a task
 */

import React from "react";
import cx from "classnames";
import type { Turnpoint } from "@main/scoring/types";

interface WaypointTableProps {
  turnpoints: Turnpoint[];
  ssIndex: number;
  esIndex: number;
  compact?: boolean;
}

const typeColors: Record<string, string> = {
  TAKEOFF: "bg-blue-100 text-blue-800",
  SSS: "bg-green-100 text-green-800",
  TURNPOINT: "bg-gray-100 text-gray-800",
  ESS: "bg-orange-100 text-orange-800",
  GOAL: "bg-red-100 text-red-800",
};

const WaypointTable: React.FC<WaypointTableProps> = ({
  turnpoints,
  ssIndex,
  esIndex,
  compact = false,
}) => {
  if (!turnpoints || turnpoints.length === 0) {
    return (
      <div className="text-gray-500 text-sm py-4 text-center">
        No turnpoints defined
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">
              Name
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">
              Type
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">
              Radius
            </th>
            {!compact && (
              <>
                <th className="px-3 py-2 text-right font-medium text-gray-600">
                  Altitude
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">
                  Lat
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">
                  Lon
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {turnpoints.map((tp, index) => {
            const isSSS = index + 1 === ssIndex;
            const isESS = index + 1 === esIndex;
            const rowIndex = index + 1;

            return (
              <tr
                key={tp.id}
                className={cx("border-b hover:bg-gray-50", {
                  "bg-green-50": isSSS,
                  "bg-orange-50": isESS,
                })}
              >
                <td className="px-3 py-2 text-gray-500">{rowIndex}</td>
                <td className="px-3 py-2 font-medium">
                  {tp.geopoint.name || `TP${rowIndex}`}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cx(
                      "inline-block px-2 py-0.5 rounded text-xs font-medium",
                      typeColors[tp.type] || "bg-gray-100"
                    )}
                  >
                    {tp.type}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {tp.radius.toLocaleString()}m
                </td>
                {!compact && (
                  <>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {tp.altitude}m
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {tp.geopoint.latitude.toFixed(5)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {tp.geopoint.longitude.toFixed(5)}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WaypointTable;
