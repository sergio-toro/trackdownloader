/**
 * Task summary component
 * Displays task metadata, distances, and start/deadline information
 */

import React from "react";
import { format, parseISO } from "date-fns";
import type { TaskDefinition } from "@main/scoring/types";

interface TaskSummaryProps {
  task: TaskDefinition;
  showTurnpoints?: boolean;
}

/**
 * Format distance in km with one decimal
 */
function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1) + " km";
}

/**
 * Format datetime to readable format
 */
function formatDateTime(isoString: string): string {
  try {
    return format(parseISO(isoString), "HH:mm 'on' dd MMM yyyy");
  } catch {
    return isoString;
  }
}

/**
 * Format time only
 */
function formatTime(isoString: string): string {
  try {
    return format(parseISO(isoString), "HH:mm");
  } catch {
    return isoString;
  }
}

const TaskSummary: React.FC<TaskSummaryProps> = ({
  task,
  showTurnpoints = false,
}) => {
  const lastTurnpoint = task.turnpoints[task.turnpoints.length - 1];
  const deadline = lastTurnpoint?.close;

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm text-gray-500">Task Type</span>
          <p className="font-medium">
            {task.taskType === "Race" ? "Race to Goal" : task.taskType}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Goal Type</span>
          <p className="font-medium">{task.goalType}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Earth Model</span>
          <p className="font-medium">{task.earthModel}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Date</span>
          <p className="font-medium">{task.date}</p>
        </div>
      </div>

      {/* Distances */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Distances</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded p-3">
            <span className="text-xs text-gray-500 block">Task Distance</span>
            <p className="text-lg font-bold text-blue-600">
              {formatDistance(task.taskDistance)}
            </p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <span className="text-xs text-gray-500 block">Speed Section</span>
            <p className="text-lg font-bold text-green-600">
              {formatDistance(task.speedSectionDistance)}
            </p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <span className="text-xs text-gray-500 block">Launch to ESS</span>
            <p className="text-lg font-bold text-orange-600">
              {formatDistance(task.launchToEssDistance)}
            </p>
          </div>
        </div>
      </div>

      {/* Leg Distances */}
      {task.legDistances && task.legDistances.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Legs</h4>
          <div className="flex flex-wrap gap-2">
            {task.legDistances.map((leg, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-sm"
              >
                <span className="text-gray-500 mr-1">Leg {index + 1}:</span>
                <span className="font-medium">{formatDistance(leg)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Start Gates */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Start Gates</h4>
        {task.startGates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {task.startGates.map((gate, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded bg-green-100 text-green-800 text-sm font-medium"
              >
                {formatTime(gate.open)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No start gates defined</p>
        )}
      </div>

      {/* Deadline */}
      {deadline && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Deadline</h4>
          <p className="text-sm">
            <span className="inline-flex items-center px-3 py-1 rounded bg-red-100 text-red-800 font-medium">
              {formatDateTime(deadline)}
            </span>
          </p>
        </div>
      )}

      {/* Turnpoint count */}
      {showTurnpoints && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Turnpoints</h4>
          <p className="text-sm">
            {task.turnpoints.length} turnpoints (SS at #{task.ssIndex}, ES at #
            {task.esIndex})
          </p>
        </div>
      )}

      {/* Settings */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Settings</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">QNH:</span>{" "}
            <span className="font-medium">{task.qnhSetting} hPa</span>
          </div>
          <div>
            <span className="text-gray-500">Leading Time Ratio:</span>{" "}
            <span className="font-medium">{task.leadingTimeRatio}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSummary;
