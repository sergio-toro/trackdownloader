/**
 * TurnpointEditor - List of turnpoints with add/edit/reorder capabilities
 */

import React, { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import TurnpointItem from "./TurnpointItem";
import type {
  Turnpoint,
  TurnpointType,
  LibraryWaypoint,
} from "@main/scoring/types";

const DEFAULT_RADII: Record<TurnpointType, number> = {
  TAKEOFF: 400,
  SSS: 3000,
  TURNPOINT: 400,
  ESS: 400,
  GOAL: 200,
};

interface TurnpointEditorProps {
  turnpoints: Turnpoint[];
  taskDate: string; // ISO date, used for default open/close times
  onChange: (turnpoints: Turnpoint[]) => void;
  onOpenWaypointLibrary: () => void;
}

/**
 * Create a new turnpoint with default values
 */
function createTurnpoint(type: TurnpointType, taskDate: string): Turnpoint {
  // Default times: open at 8am, close at 6pm on task date
  const openTime = new Date(`${taskDate}T08:00:00`);
  const closeTime = new Date(`${taskDate}T18:00:00`);

  return {
    id: uuidv4(),
    geopoint: {
      latitude: 0,
      longitude: 0,
      altitude: 0,
      name: "",
    },
    radius: DEFAULT_RADII[type],
    open: openTime.toISOString(),
    close: closeTime.toISOString(),
    altitude: 0,
    type,
  };
}

/**
 * Create a turnpoint from a library waypoint
 */
export function waypointToTurnpoint(
  waypoint: LibraryWaypoint,
  type: TurnpointType,
  taskDate: string
): Turnpoint {
  const openTime = new Date(`${taskDate}T08:00:00`);
  const closeTime = new Date(`${taskDate}T18:00:00`);

  return {
    id: uuidv4(),
    geopoint: {
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      altitude: waypoint.altitude,
      name: waypoint.name,
    },
    radius: DEFAULT_RADII[type],
    open: openTime.toISOString(),
    close: closeTime.toISOString(),
    altitude: waypoint.altitude,
    type,
  };
}

const TurnpointEditor: React.FC<TurnpointEditorProps> = ({
  turnpoints,
  taskDate,
  onChange,
  onOpenWaypointLibrary,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleTurnpointChange = useCallback(
    (index: number, updates: Partial<Turnpoint>) => {
      const newTurnpoints = [...turnpoints];
      newTurnpoints[index] = { ...newTurnpoints[index], ...updates };
      onChange(newTurnpoints);
    },
    [turnpoints, onChange]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newTurnpoints = turnpoints.filter((_, i) => i !== index);
      onChange(newTurnpoints);
    },
    [turnpoints, onChange]
  );

  const handleDuplicate = useCallback(
    (index: number) => {
      const newTurnpoints = [...turnpoints];
      const duplicated: Turnpoint = {
        ...turnpoints[index],
        id: uuidv4(),
        geopoint: { ...turnpoints[index].geopoint },
      };
      newTurnpoints.splice(index + 1, 0, duplicated);
      onChange(newTurnpoints);
      // Expand the new turnpoint
      setExpandedIds((prev) => new Set(prev).add(duplicated.id));
    },
    [turnpoints, onChange]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newTurnpoints = [...turnpoints];
      [newTurnpoints[index - 1], newTurnpoints[index]] = [
        newTurnpoints[index],
        newTurnpoints[index - 1],
      ];
      onChange(newTurnpoints);
    },
    [turnpoints, onChange]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === turnpoints.length - 1) return;
      const newTurnpoints = [...turnpoints];
      [newTurnpoints[index], newTurnpoints[index + 1]] = [
        newTurnpoints[index + 1],
        newTurnpoints[index],
      ];
      onChange(newTurnpoints);
    },
    [turnpoints, onChange]
  );

  const addTurnpoint = useCallback(
    (type: TurnpointType = "TURNPOINT") => {
      const newTurnpoint = createTurnpoint(type, taskDate);
      const newTurnpoints = [...turnpoints, newTurnpoint];
      onChange(newTurnpoints);
      // Expand the new turnpoint
      setExpandedIds((prev) => new Set(prev).add(newTurnpoint.id));
    },
    [turnpoints, taskDate, onChange]
  );

  const addDefaultTask = useCallback(() => {
    // Add a complete default task structure
    const defaults: TurnpointType[] = [
      "TAKEOFF",
      "SSS",
      "TURNPOINT",
      "ESS",
      "GOAL",
    ];
    const newTurnpoints = defaults.map((type) =>
      createTurnpoint(type, taskDate)
    );
    onChange(newTurnpoints);
    // Expand the first turnpoint
    setExpandedIds(new Set([newTurnpoints[0].id]));
  }, [taskDate, onChange]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700">
          Turnpoints ({turnpoints.length})
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenWaypointLibrary}
            className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
          >
            From Library
          </button>
          <button
            type="button"
            onClick={() => addTurnpoint()}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            + Add Turnpoint
          </button>
        </div>
      </div>

      {/* Turnpoint list */}
      {turnpoints.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-3">No turnpoints defined</p>
          <button
            type="button"
            onClick={addDefaultTask}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Create Default Task Structure
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Creates: TAKEOFF → SSS → TURNPOINT → ESS → GOAL
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {turnpoints.map((tp, index) => (
            <TurnpointItem
              key={tp.id}
              turnpoint={tp}
              index={index}
              isExpanded={expandedIds.has(tp.id)}
              canMoveUp={index > 0}
              canMoveDown={index < turnpoints.length - 1}
              onToggleExpand={() => toggleExpand(tp.id)}
              onChange={(updates) => handleTurnpointChange(index, updates)}
              onDelete={() => handleDelete(index)}
              onDuplicate={() => handleDuplicate(index)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
            />
          ))}
        </div>
      )}

      {/* Quick add buttons when turnpoints exist */}
      {turnpoints.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="text-xs text-gray-500 self-center">Quick add:</span>
          {(
            ["TAKEOFF", "SSS", "TURNPOINT", "ESS", "GOAL"] as TurnpointType[]
          ).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addTurnpoint(type)}
              className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
            >
              + {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TurnpointEditor;
