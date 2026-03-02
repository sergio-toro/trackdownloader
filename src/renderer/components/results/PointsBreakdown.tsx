/**
 * Points breakdown chart component
 *
 * Displays a stacked horizontal bar showing point distribution
 */

import React from "react";
import type { AvailablePoints, PilotResult } from "@main/scoring/types";

interface PointsBreakdownProps {
  availablePoints: AvailablePoints;
  pilotResult?: PilotResult;
}

const PointsBreakdown: React.FC<PointsBreakdownProps> = ({
  availablePoints,
  pilotResult,
}) => {
  const total = availablePoints.totalAvailable;

  const categories = [
    {
      key: "distance",
      label: "Distance",
      available: availablePoints.distanceAvailable,
      earned: pilotResult?.distancePoints ?? 0,
      color: "bg-blue-500",
      bgColor: "bg-blue-200",
    },
    {
      key: "time",
      label: "Time",
      available: availablePoints.timeAvailable,
      earned: pilotResult?.timePoints ?? 0,
      color: "bg-green-500",
      bgColor: "bg-green-200",
    },
    {
      key: "leading",
      label: "Leading",
      available: availablePoints.leadingAvailable,
      earned: pilotResult?.leadingPoints ?? 0,
      color: "bg-orange-500",
      bgColor: "bg-orange-200",
    },
    {
      key: "arrival",
      label: "Arrival",
      available: availablePoints.arrivalAvailable,
      earned: pilotResult?.arrivalPoints ?? 0,
      color: "bg-purple-500",
      bgColor: "bg-purple-200",
    },
  ].filter((c) => c.available > 0);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Available Points</span>
        <span className="font-medium">{total.toFixed(0)}</span>
      </div>

      {/* Stacked bar */}
      <div className="h-6 flex rounded overflow-hidden bg-gray-100">
        {categories.map((cat) => {
          const widthPercent = (cat.available / total) * 100;
          return (
            <div
              key={cat.key}
              className={`${cat.color} relative group`}
              style={{ width: `${widthPercent}%` }}
              title={`${cat.label}: ${cat.available.toFixed(0)}`}
            >
              {widthPercent > 10 && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                  {cat.available.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${cat.color}`} />
            <span className="text-gray-600">
              {cat.label}: {cat.available.toFixed(0)}
              {pilotResult && (
                <span className="text-gray-400">
                  {" "}
                  ({cat.earned.toFixed(1)})
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Pilot earned (if provided) */}
      {pilotResult && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Pilot Total</span>
            <span className="font-semibold">
              {pilotResult.totalPoints.toFixed(1)}
            </span>
          </div>

          {/* Earned bar */}
          <div className="h-4 mt-1 flex rounded overflow-hidden bg-gray-100">
            {categories.map((cat) => {
              const widthPercent = (cat.earned / total) * 100;
              return (
                <div
                  key={cat.key}
                  className={cat.color}
                  style={{ width: `${widthPercent}%` }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsBreakdown;
