import React, { useState, useCallback } from "react";
import type {
  TaskDefinition,
  TaskResult,
  Participant,
} from "@main/scoring/types";
import { useCompetition } from "@renderer/context/competitionContext";
import TurnpointList from "./TurnpointList";
import TaskParticipantTable from "./TaskParticipantTable";
import TaskDownloadPanel from "./TaskDownloadPanel";
import TaskMap from "./TaskMap";
import TaskResultsTable from "@components/results/TaskResultsTable";

type DetailTab = "info" | "participants" | "results";

interface TaskDetailViewProps {
  task: TaskDefinition;
  taskResult?: TaskResult;
  participants: Participant[];
  competitionId: string;
  competitionName: string;
  onBack: () => void;
  onEditTask: (task: TaskDefinition) => void;
  onScoreTask: (taskId: string) => Promise<void>;
}

const formatDistance = (meters: number): string => {
  return `${(meters / 1000).toFixed(1)} km`;
};

const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  task,
  taskResult,
  participants,
  competitionId,
  competitionName,
  onBack,
  onEditTask,
  onScoreTask,
}) => {
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("info");

  const { updateParticipant } = useCompetition();
  const isScored = !!taskResult;

  const handleScore = async () => {
    setIsScoring(true);
    try {
      await onScoreTask(task.id);
    } finally {
      setIsScoring(false);
    }
  };

  const handleOpenFolder = useCallback(async () => {
    const igcFolder = await window.scoring.getCompetitionIgcFolder(
      competitionId,
      task.id
    );
    await window.scoring.openFolder(igcFolder);
  }, [competitionId, task.id]);

  const handleScanFolder = useCallback(async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const igcFolder = await window.scoring.getCompetitionIgcFolder(
        competitionId,
        task.id
      );
      const { validIgcs } = await window.tracks.listIGCs(igcFolder);

      let assigned = 0;
      for (const igc of validIgcs) {
        const participant = participants.find((p) => p.id === igc.pilotId);
        if (!participant) continue;

        const hasTrack = participant.taskTracks?.some(
          (t) => t.taskId === task.id
        );
        if (hasTrack) continue;

        const igcPath = `${igcFolder}/${igc.name}`;
        const existingTracks = participant.taskTracks || [];
        const updatedTracks = [
          ...existingTracks,
          {
            taskId: task.id,
            igcPath,
            uploadedAt: new Date().toISOString(),
          },
        ];
        await updateParticipant(igc.pilotId, { taskTracks: updatedTracks });
        assigned++;
      }

      setScanResult(
        assigned > 0
          ? `Assigned ${assigned} track${assigned > 1 ? "s" : ""}`
          : "No new tracks found"
      );
    } catch (err) {
      console.error("Error scanning IGC folder:", err);
      setScanResult("Error scanning folder");
    } finally {
      setIsScanning(false);
    }
  }, [competitionId, task.id, participants, updateParticipant]);

  const trackCount = participants.filter((p) =>
    p.taskTracks?.some((t) => t.taskId === task.id)
  ).length;
  const missingCount = participants.length - trackCount;

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "participants", label: "Participants" },
    { key: "results", label: "Results" },
  ];

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to {competitionName}
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
              {competitionName}
            </p>
            <h3 className="text-lg font-semibold text-gray-900">{task.name}</h3>
            <p className="text-sm text-gray-500">{task.date}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEditTask(task)}
              className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded text-sm hover:bg-amber-200 flex items-center gap-1"
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
              Edit
            </button>
            {isScored ? (
              <button
                onClick={handleScore}
                disabled={isScoring}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 disabled:bg-gray-50 flex items-center gap-1"
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
                {isScoring ? "Recalculating..." : "Recalculate"}
              </button>
            ) : (
              <button
                onClick={handleScore}
                disabled={isScoring}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
              >
                {isScoring ? "Scoring..." : "Score Task"}
              </button>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          <div>
            <span className="text-gray-400">Type:</span> {task.taskType}
          </div>
          <div>
            <span className="text-gray-400">Distance:</span>{" "}
            {formatDistance(task.taskDistance)}
          </div>
          <div>
            <span className="text-gray-400">Speed Section:</span>{" "}
            {formatDistance(task.speedSectionDistance)}
          </div>
          <div>
            <span className="text-gray-400">Goal:</span> {task.goalType}
          </div>
          <div>
            <span className="text-gray-400">State:</span> {task.state}
          </div>
        </div>

        {/* Scored info */}
        {isScored && taskResult && (
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-gray-400">Day Quality:</span>{" "}
              <span className="font-medium">
                {(taskResult.dayQuality * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">In Goal:</span>{" "}
              <span className="font-medium">
                {taskResult.statistics.pilotsInGoal}/
                {taskResult.statistics.pilotsFlying}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "info" && (
        <>
          {/* Task map */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Task Map
            </h4>
            <TaskMap
              turnpoints={task.turnpoints}
              shortestRoute={task.shortestRoute}
            />
          </div>

          {/* Turnpoints section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Turnpoints ({task.turnpoints.length})
            </h4>
            <TurnpointList
              turnpoints={task.turnpoints}
              legDistances={task.legDistances}
            />
          </div>
        </>
      )}

      {activeTab === "participants" && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-md font-semibold text-gray-900">
              Participants ({participants.length})
            </h4>
            <div className="flex gap-2">
              <button
                onClick={handleOpenFolder}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 flex items-center gap-1"
                title="Open IGC folder"
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
                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                  />
                </svg>
                Open Folder
              </button>
              <button
                onClick={handleScanFolder}
                disabled={isScanning}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 flex items-center gap-1"
                title="Scan IGC folder and auto-assign tracks to participants"
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {isScanning ? "Scanning..." : "Scan Folder"}
              </button>
              <button
                onClick={() => setShowDownloadPanel(true)}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 flex items-center gap-1"
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
                Download
                {missingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full">
                    {missingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          {scanResult && (
            <div className="mb-3 text-sm text-gray-600 px-1">{scanResult}</div>
          )}
          <TaskParticipantTable participants={participants} taskId={task.id} />
        </div>
      )}

      {activeTab === "results" && (
        <div>
          {isScored && taskResult ? (
            <TaskResultsTable
              taskResult={taskResult}
              participants={participants}
            />
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-4">
                This task has not been scored yet
              </p>
              <button
                onClick={handleScore}
                disabled={isScoring}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {isScoring ? "Scoring..." : "Score Task"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Download panel modal */}
      {showDownloadPanel && (
        <TaskDownloadPanel
          isOpen={showDownloadPanel}
          onClose={() => setShowDownloadPanel(false)}
          task={task}
          participants={participants}
          competitionId={competitionId}
        />
      )}
    </div>
  );
};

export default TaskDetailView;
