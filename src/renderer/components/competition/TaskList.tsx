/**
 * Task list component
 *
 * Displays grid of task cards with scoring status
 */

import React, { useState } from "react";
import type {
  TaskDefinition,
  TaskResult,
  Participant,
} from "@main/scoring/types";
import TaskDownloadPanel from "./TaskDownloadPanel";
import TaskDetailView from "./TaskDetailView";

interface TaskListProps {
  tasks: TaskDefinition[];
  taskResults: Record<string, TaskResult>;
  onScoreTask: (taskId: string) => Promise<void>;
  onViewResults: (taskId: string) => void;
  participants: Participant[];
  competitionId: string;
  onAddTask: () => void;
  onImportTask: () => void;
  onEditTask: (task: TaskDefinition) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  taskResults,
  onScoreTask,
  onViewResults,
  participants,
  competitionId,
  onAddTask,
  onImportTask,
  onEditTask,
  onDeleteTask,
}) => {
  const [scoringTaskId, setScoringTaskId] = useState<string | null>(null);
  const [downloadingTaskId, setDownloadingTaskId] = useState<string | null>(
    null
  );
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<
    string | null
  >(null);

  const selectedDetailTask = selectedDetailTaskId
    ? (tasks.find((t) => t.id === selectedDetailTaskId) ?? null)
    : null;

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

  // Header component with action buttons
  const TaskHeader = () => (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
      <div className="flex gap-2">
        <button
          onClick={onAddTask}
          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Task
        </button>
        <button
          onClick={onImportTask}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Import .xctrack
        </button>
      </div>
    </div>
  );

  if (selectedDetailTask) {
    return (
      <TaskDetailView
        task={selectedDetailTask}
        taskResult={taskResults[selectedDetailTask.id]}
        participants={participants}
        competitionId={competitionId}
        onBack={() => setSelectedDetailTaskId(null)}
        onEditTask={onEditTask}
        onScoreTask={onScoreTask}
        onViewResults={onViewResults}
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <>
        <TaskHeader />
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
      </>
    );
  }

  const downloadingTask = downloadingTaskId
    ? tasks.find((t) => t.id === downloadingTaskId)
    : null;

  return (
    <>
      <TaskHeader />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => {
          const result = taskResults[task.id];
          const isScored = !!result;
          const isScoring = scoringTaskId === task.id;

          return (
            <div
              key={task.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => setSelectedDetailTaskId(task.id)}
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

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                  onClick={() => onEditTask(task)}
                  className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded text-sm hover:bg-amber-200"
                  title="Edit task"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setDownloadingTaskId(task.id)}
                  className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                  title="Download tracks"
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                    />
                  </svg>
                </button>
                {isScored && (
                  <button
                    onClick={() => handleScoreTask(task.id)}
                    disabled={isScoring}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 disabled:bg-gray-50"
                    title="Recalculate scoring"
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
                )}
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete task "${task.name}"? This will remove all associated tracks and results.`
                      )
                    ) {
                      onDeleteTask(task.id);
                    }
                  }}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  title="Delete task"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Download panel modal */}
      {downloadingTask && (
        <TaskDownloadPanel
          isOpen={!!downloadingTaskId}
          onClose={() => setDownloadingTaskId(null)}
          task={downloadingTask}
          participants={participants}
          competitionId={competitionId}
        />
      )}
    </>
  );
};

export default TaskList;
