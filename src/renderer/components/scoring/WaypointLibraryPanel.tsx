/**
 * WaypointLibraryPanel - Side panel for waypoint library
 *
 * Allows searching, importing, and adding waypoints to task
 */

import React, { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import type { LibraryWaypoint, TurnpointType } from "@main/scoring/types";

const TYPE_OPTIONS: { value: TurnpointType; label: string }[] = [
  { value: "TAKEOFF", label: "Takeoff" },
  { value: "SSS", label: "Start (SSS)" },
  { value: "TURNPOINT", label: "Turnpoint" },
  { value: "ESS", label: "End Speed (ESS)" },
  { value: "GOAL", label: "Goal" },
];

interface WaypointLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWaypoint: (waypoint: LibraryWaypoint, type: TurnpointType) => void;
}

const WaypointLibraryPanel: React.FC<WaypointLibraryPanelProps> = ({
  isOpen,
  onClose,
  onAddWaypoint,
}) => {
  const [waypoints, setWaypoints] = useState<LibraryWaypoint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TurnpointType>("TURNPOINT");
  const [isImporting, setIsImporting] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Load waypoints on mount and when search changes
  const loadWaypoints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filter = debouncedQuery ? { query: debouncedQuery } : undefined;
      const results = await window.scoring.listWaypoints(filter);
      setWaypoints(results);
    } catch (err) {
      console.error("Error loading waypoints:", err);
      setError("Failed to load waypoints");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (isOpen) {
      loadWaypoints();
    }
  }, [isOpen, loadWaypoints]);

  const handleImportCup = useCallback(async () => {
    setIsImporting(true);
    setError(null);
    try {
      const result = await window.scoring.importCup();
      if (result) {
        // Refresh waypoints list
        await loadWaypoints();
        if (result.errors.length > 0) {
          setError(
            `Imported ${result.imported}, ${result.errors.length} errors`
          );
        }
      }
    } catch (err) {
      console.error("Error importing CUP file:", err);
      setError("Failed to import CUP file");
    } finally {
      setIsImporting(false);
    }
  }, [loadWaypoints]);

  const handleAddWaypoint = useCallback(
    (waypoint: LibraryWaypoint) => {
      onAddWaypoint(waypoint, selectedType);
    },
    [onAddWaypoint, selectedType]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-96 bg-white shadow-xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800">Waypoint Library</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search and import */}
        <div className="px-4 py-3 border-b space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search waypoints..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as TurnpointType)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Add as: {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleImportCup}
              disabled={isImporting}
              className="px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              {isImporting ? "..." : "Import .cup"}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Waypoint list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : waypoints.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-gray-500 mb-2">
                {searchQuery ? "No waypoints found" : "No waypoints in library"}
              </p>
              <p className="text-sm text-gray-400">
                Import waypoints from a .cup file to get started
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {waypoints.map((wp) => (
                <div
                  key={wp.id}
                  className="px-4 py-3 hover:bg-gray-50 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {wp.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {wp.altitude}m{wp.code && ` · ${wp.code}`}
                      {wp.source && ` · ${wp.source}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddWaypoint(wp)}
                    className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 whitespace-nowrap"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-500">
          {waypoints.length} waypoints
          {searchQuery && " (filtered)"}
        </div>
      </div>
    </div>
  );
};

export default WaypointLibraryPanel;
