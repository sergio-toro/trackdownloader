/**
 * Task results table component
 *
 * Displays pilot results for a single task with sorting and filtering
 */

import React, { useState, useMemo } from "react";
import type { TaskResult, Participant } from "@main/scoring/types";
import PointsBreakdown from "./PointsBreakdown";

interface TaskResultsTableProps {
  taskResult: TaskResult;
  participants: Participant[];
}

type SortKey = "rank" | "name" | "distance" | "time" | "total";
type FilterType = "all" | "goal" | "landedOut";

const TaskResultsTable: React.FC<TaskResultsTableProps> = ({
  taskResult,
  participants,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  // Build participant lookup
  const participantMap = useMemo(() => {
    const map = new Map<number, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [participants]);

  // Filter and sort results
  const sortedResults = useMemo(() => {
    let results = [...taskResult.pilotResults];

    // Filter by goal status
    if (filter === "goal") {
      results = results.filter((r) => r.reachedGoal);
    } else if (filter === "landedOut") {
      results = results.filter((r) => !r.reachedGoal);
    }

    // Filter by name search
    if (search) {
      const needle = search.toLowerCase();
      results = results.filter((r) => {
        const name = participantMap.get(r.pilotId)?.name || "";
        return name.toLowerCase().includes(needle);
      });
    }

    // Sort
    results.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "rank":
          cmp = a.rank - b.rank;
          break;
        case "name": {
          const nameA = participantMap.get(a.pilotId)?.name || "";
          const nameB = participantMap.get(b.pilotId)?.name || "";
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case "distance":
          cmp = a.distance - b.distance;
          break;
        case "time":
          cmp = (a.time || Infinity) - (b.time || Infinity);
          break;
        case "total":
          cmp = a.totalPoints - b.totalPoints;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return results;
  }, [
    taskResult.pilotResults,
    sortKey,
    sortAsc,
    filter,
    search,
    participantMap,
  ]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "rank" || key === "time");
    }
  };

  const formatDistance = (meters: number): string => {
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return "-";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  const SortIcon: React.FC<{ active: boolean; asc: boolean }> = ({
    active,
    asc,
  }) => (
    <svg
      className={`w-3 h-3 ml-1 inline ${active ? "text-blue-600" : "text-gray-400"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={asc ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
      />
    </svg>
  );

  return (
    <div className="space-y-4">
      {/* Task summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          {taskResult.taskName}
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Day Quality</div>
            <div className="text-lg font-semibold">
              {(taskResult.dayQuality * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">In Goal</div>
            <div className="text-lg font-semibold">
              {taskResult.statistics.pilotsInGoal} /{" "}
              {taskResult.statistics.pilotsFlying}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Best Distance</div>
            <div className="text-lg font-semibold">
              {formatDistance(taskResult.statistics.bestDistance)}
            </div>
          </div>
          {taskResult.statistics.bestTime > 0 && (
            <div>
              <div className="text-sm text-gray-500">Best Time</div>
              <div className="text-lg font-semibold">
                {formatTime(taskResult.statistics.bestTime)}
              </div>
            </div>
          )}
        </div>

        {/* Points breakdown chart */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <PointsBreakdown availablePoints={taskResult.availablePoints} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex gap-2">
          {(["all", "goal", "landedOut"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All" : f === "goal" ? "In Goal" : "Landed Out"}
            </button>
          ))}
        </div>
      </div>

      {/* Results table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("rank")}
              >
                Rank
                <SortIcon active={sortKey === "rank"} asc={sortAsc} />
              </th>
              <th
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("name")}
              >
                Pilot
                <SortIcon active={sortKey === "name"} asc={sortAsc} />
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("distance")}
              >
                Distance
                <SortIcon active={sortKey === "distance"} asc={sortAsc} />
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("time")}
              >
                Time
                <SortIcon active={sortKey === "time"} asc={sortAsc} />
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dist Pts
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Pts
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead Pts
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Penalty
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("total")}
              >
                Total
                <SortIcon active={sortKey === "total"} asc={sortAsc} />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedResults.map((result) => {
              const participant = participantMap.get(result.pilotId);
              return (
                <tr
                  key={result.pilotId}
                  className={`hover:bg-gray-50 ${
                    result.reachedGoal ? "bg-green-50" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                    {result.rank}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-medium text-gray-900">
                      {participant?.name || `Pilot ${result.pilotId}`}
                    </div>
                    {participant?.nation && (
                      <div className="text-xs text-gray-500">
                        {participant.nation}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">
                    {formatDistance(result.distance)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">
                    {formatTime(result.time)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 text-right">
                    {result.distancePoints.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 text-right">
                    {result.timePoints.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 text-right">
                    {result.leadingPoints.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-sm text-red-600 text-right">
                    {result.penaltyPoints > 0
                      ? `-${result.penaltyPoints.toFixed(1)}`
                      : ""}
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold text-gray-900 text-right">
                    {result.totalPoints.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Result count */}
      <div className="text-sm text-gray-500">
        Showing {sortedResults.length} of {taskResult.pilotResults.length}{" "}
        results
      </div>
    </div>
  );
};

export default TaskResultsTable;
