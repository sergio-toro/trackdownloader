/**
 * TurnpointItem - Collapsible turnpoint editor row
 *
 * Shows summary when collapsed, full edit form when expanded.
 */

import React from "react";
import cx from "classnames";
import type { Turnpoint, TurnpointType } from "@main/scoring/types";

const TURNPOINT_TYPES: TurnpointType[] = [
  "TAKEOFF",
  "SSS",
  "TURNPOINT",
  "ESS",
  "GOAL",
];

const TYPE_COLORS: Record<TurnpointType, string> = {
  TAKEOFF: "bg-blue-100 text-blue-800",
  SSS: "bg-green-100 text-green-800",
  TURNPOINT: "bg-gray-100 text-gray-800",
  ESS: "bg-orange-100 text-orange-800",
  GOAL: "bg-red-100 text-red-800",
};

const DEFAULT_RADII: Record<TurnpointType, number> = {
  TAKEOFF: 400,
  SSS: 3000,
  TURNPOINT: 400,
  ESS: 400,
  GOAL: 200,
};

interface TurnpointItemProps {
  turnpoint: Turnpoint;
  index: number;
  isExpanded: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleExpand: () => void;
  onChange: (updates: Partial<Turnpoint>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const TurnpointItem: React.FC<TurnpointItemProps> = ({
  turnpoint,
  index,
  isExpanded,
  canMoveUp,
  canMoveDown,
  onToggleExpand,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}) => {
  const handleTypeChange = (newType: TurnpointType) => {
    onChange({
      type: newType,
      // Update radius to default for new type if it was the default for old type
      radius:
        turnpoint.radius === DEFAULT_RADII[turnpoint.type]
          ? DEFAULT_RADII[newType]
          : turnpoint.radius,
    });
  };

  const handleGeopointChange = (
    field: "latitude" | "longitude",
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange({
        geopoint: {
          ...turnpoint.geopoint,
          [field]: numValue,
        },
      });
    }
  };

  const handleNameChange = (name: string) => {
    onChange({
      geopoint: {
        ...turnpoint.geopoint,
        name,
      },
    });
  };

  return (
    <div
      className={cx("border rounded-lg overflow-hidden", {
        "border-blue-300 bg-blue-50/50": isExpanded,
        "border-gray-200 bg-white hover:border-gray-300": !isExpanded,
      })}
    >
      {/* Header row - always visible */}
      <div
        className={cx(
          "flex items-center gap-2 px-3 py-2 cursor-pointer select-none",
          { "border-b": isExpanded }
        )}
        onClick={onToggleExpand}
      >
        {/* Expand/collapse indicator */}
        <span className="text-gray-400 w-4">{isExpanded ? "▼" : "▶"}</span>

        {/* Index */}
        <span className="w-6 text-center text-sm text-gray-500 font-medium">
          {index + 1}
        </span>

        {/* Type badge */}
        <span
          className={cx(
            "px-2 py-0.5 rounded text-xs font-medium w-24 text-center",
            TYPE_COLORS[turnpoint.type]
          )}
        >
          {turnpoint.type}
        </span>

        {/* Name */}
        <span className="flex-1 truncate text-sm font-medium">
          {turnpoint.geopoint.name || `TP${index + 1}`}
        </span>

        {/* Radius */}
        <span className="text-sm text-gray-500 w-20 text-right">
          {turnpoint.radius}m
        </span>

        {/* Move buttons */}
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className={cx(
              "p-1 rounded text-xs",
              canMoveUp
                ? "text-gray-600 hover:bg-gray-200"
                : "text-gray-300 cursor-not-allowed"
            )}
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className={cx(
              "p-1 rounded text-xs",
              canMoveDown
                ? "text-gray-600 hover:bg-gray-200"
                : "text-gray-300 cursor-not-allowed"
            )}
            title="Move down"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Expanded form */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Row 1: Name and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={turnpoint.geopoint.name || ""}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Turnpoint name"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={turnpoint.type}
                onChange={(e) =>
                  handleTypeChange(e.target.value as TurnpointType)
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TURNPOINT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Coordinates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="0.00001"
                min="-90"
                max="90"
                value={turnpoint.geopoint.latitude}
                onChange={(e) =>
                  handleGeopointChange("latitude", e.target.value)
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="0.00001"
                min="-180"
                max="180"
                value={turnpoint.geopoint.longitude}
                onChange={(e) =>
                  handleGeopointChange("longitude", e.target.value)
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Altitude (m)
              </label>
              <input
                type="number"
                value={turnpoint.altitude}
                onChange={(e) =>
                  onChange({ altitude: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Radius and Times */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Radius (m)
              </label>
              <input
                type="number"
                min="1"
                value={turnpoint.radius}
                onChange={(e) =>
                  onChange({ radius: parseInt(e.target.value, 10) || 100 })
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Open Time
              </label>
              <input
                type="datetime-local"
                value={turnpoint.open.slice(0, 16)}
                onChange={(e) =>
                  onChange({ open: new Date(e.target.value).toISOString() })
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Close Time
              </label>
              <input
                type="datetime-local"
                value={turnpoint.close.slice(0, 16)}
                onChange={(e) =>
                  onChange({ close: new Date(e.target.value).toISOString() })
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              onClick={onDuplicate}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Duplicate
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurnpointItem;
