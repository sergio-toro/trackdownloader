/**
 * Task list component
 *
 * Displays grid of task cards with scoring status
 */

import React from "react";
import type { TaskDefinition, TaskResult } from "@main/scoring/types";

interface TaskListProps {
  tasks: TaskDefinition[];
  taskResults: Record<string, TaskResult>;
  onScoreTask: (taskId: string) => Promise<void>;
  onViewResults: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  taskResults,
  onScoreTask,
  onViewResults,
}) => {
  const [scoringTaskId, setScoringTaskId] = React.useState<string | null>(null);

  const handleScoreTask = async (taskId: string) => {
    setScoringTaskId(taskId);
    try {
      await onScoreTask(taskId);
    } finally {
      setScoringTaskId(null);
    }
  };

  const formatDistance = (meters: number): string => {
    return `${(meters / 1000).toFixed(1)} km`;
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <svg
          className="w-12 h-12 mx-auto text-gray-400 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-gray-500 mb-1">No tasks yet</p>
        <p className="text-sm text-gray-400">
          Import or create a task to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => {
        const result = taskResults[task.id];
        const isScored = !!result;
        const isScoring = scoringTaskId === task.id;

        return (
          <div
            key={task.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{task.name}</h3>
                <p className="text-sm text-gray-500">{task.date}</p>
              </div>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  isScored
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {isScored ? "Scored" : "Not Scored"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
              <div>
                <span className="text-gray-400">Distance:</span>{" "}
                {formatDistance(task.taskDistance)}
              </div>
              <div>
                <span className="text-gray-400">Turnpoints:</span>{" "}
                {task.turnpoints.length}
              </div>
              <div>
                <span className="text-gray-400">Type:</span> {task.taskType}
              </div>
              {isScored && result && (
                <div>
                  <span className="text-gray-400">In Goal:</span>{" "}
                  {result.statistics.pilotsInGoal}/
                  {result.statistics.pilotsFlying}
                </div>
              )}
            </div>

            {isScored && result && (
              <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Day Quality</span>
                  <span className="font-medium">
                    {(result.dayQuality * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isScored ? (
                <button
                  onClick={() => onViewResults(task.id)}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  View Results
                </button>
              ) : (
                <button
                  onClick={() => handleScoreTask(task.id)}
                  disabled={isScoring}
                  className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isScoring ? "Scoring..." : "Score Task"}
                </button>
              )}
              <button
                onClick={() => handleScoreTask(task.id)}
                disabled={isScoring}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 disabled:bg-gray-50"
                title="Rescore task"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskList;
