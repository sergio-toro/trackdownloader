/**
 * Task download panel modal
 *
 * Modal dialog for downloading IGC tracks for a specific task
 */

import React, { useState, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import type { TaskDefinition, Participant } from "@main/scoring/types";
import { useSettings } from "@renderer/context/settingsContext";
import { useCompetition } from "@renderer/context/competitionContext";
import useCompetitionDownload from "@renderer/hooks/useCompetitionDownload";
import PilotDownloadTable, {
  DownloadSource,
} from "@renderer/components/competition/PilotDownloadTable";
import DownloadProgressIndicator from "@renderer/components/competition/DownloadProgressIndicator";

interface TaskDownloadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDefinition;
  participants: Participant[];
  competitionId: string;
}

const TaskDownloadPanel: React.FC<TaskDownloadPanelProps> = ({
  isOpen,
  onClose,
  task,
  participants,
  competitionId,
}) => {
  const [source, setSource] = useState<DownloadSource>("xcontest");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedFlymasterGroup, setSelectedFlymasterGroup] = useState<
    string | null
  >(null);

  const {
    settings: { flymaster },
  } = useSettings();
  const { updateParticipant } = useCompetition();

  const handleTrackDownloaded = useCallback(
    async (participantId: number, igcPath: string) => {
      const participant = participants.find((p) => p.id === participantId);
      if (!participant) return;

      const existingTracks = participant.taskTracks || [];
      const existingIndex = existingTracks.findIndex(
        (t) => t.taskId === task.id
      );

      const newTrack = {
        taskId: task.id,
        igcPath,
        uploadedAt: new Date().toISOString(),
      };

      let updatedTracks;
      if (existingIndex >= 0) {
        updatedTracks = [...existingTracks];
        updatedTracks[existingIndex] = newTrack;
      } else {
        updatedTracks = [...existingTracks, newTrack];
      }

      await updateParticipant(participantId, { taskTracks: updatedTracks });
    },
    [participants, task.id, updateParticipant]
  );

  const {
    downloadXcontest,
    downloadVolandoo,
    downloadFlymaster,
    xcontestProgress,
    volandooProgress,
    flymasterProgress,
    downloadStatus,
    isDownloading,
    errorMessage,
    cancelDownload,
  } = useCompetitionDownload({
    competitionId,
    taskId: task.id,
    taskDate: task.date,
    participants,
    onTrackDownloaded: handleTrackDownloaded,
  });

  const handleDownload = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    switch (source) {
      case "xcontest":
        await downloadXcontest(ids);
        break;
      case "volandoo":
        await downloadVolandoo(ids);
        break;
      case "flymaster":
        if (selectedFlymasterGroup) {
          await downloadFlymaster(ids, selectedFlymasterGroup);
        }
        break;
    }
  }, [
    source,
    selectedIds,
    selectedFlymasterGroup,
    downloadXcontest,
    downloadVolandoo,
    downloadFlymaster,
  ]);

  const selectableCount = useMemo(() => {
    return participants.filter((p) =>
      source === "xcontest"
        ? p.xcontest
        : source === "volandoo"
          ? p.volandoo
          : true
    ).length;
  }, [participants, source]);

  const selectAll = useCallback(() => {
    const allSelectable = participants
      .filter((p) =>
        source === "xcontest"
          ? p.xcontest
          : source === "volandoo"
            ? p.volandoo
            : true
      )
      .map((p) => p.id);
    setSelectedIds(new Set(allSelectable));
  }, [participants, source]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectMissing = useCallback(() => {
    const missing = participants
      .filter((p) => {
        const hasTrack = p.taskTracks?.some((t) => t.taskId === task.id);
        const hasSourceId =
          source === "xcontest"
            ? p.xcontest
            : source === "volandoo"
              ? p.volandoo
              : true;
        return !hasTrack && hasSourceId;
      })
      .map((p) => p.id);
    setSelectedIds(new Set(missing));
  }, [participants, task.id, source]);

  const activeProgress =
    source === "xcontest"
      ? xcontestProgress
      : source === "volandoo"
        ? volandooProgress
        : flymasterProgress;

  const canDownload =
    selectedIds.size > 0 &&
    !isDownloading &&
    (source !== "flymaster" || selectedFlymasterGroup);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Download Tracks
            </h2>
            <p className="text-sm text-gray-500">{task.name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
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

        {/* Task info */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              Task Date:{" "}
              <span className="font-medium text-gray-900">
                {format(parseISO(task.date), "yyyy-MM-dd")}
              </span>
            </span>
          </div>
        </div>

        {/* Source selector */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Source:</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSource("xcontest");
                  setSelectedIds(new Set());
                }}
                disabled={isDownloading}
                className={`px-3 py-1.5 text-sm rounded ${
                  source === "xcontest"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                XContest
              </button>
              <button
                onClick={() => {
                  setSource("volandoo");
                  setSelectedIds(new Set());
                }}
                disabled={isDownloading}
                className={`px-3 py-1.5 text-sm rounded ${
                  source === "volandoo"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                Volandoo
              </button>
              <button
                onClick={() => {
                  setSource("flymaster");
                  setSelectedIds(new Set());
                }}
                disabled={isDownloading}
                className={`px-3 py-1.5 text-sm rounded ${
                  source === "flymaster"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                Flymaster
              </button>
            </div>

            {/* Flymaster group selector */}
            {source === "flymaster" && flymaster?.groups && (
              <select
                value={selectedFlymasterGroup || ""}
                onChange={(e) => setSelectedFlymasterGroup(e.target.value)}
                disabled={isDownloading}
                className="ml-2 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select group...</option>
                {flymaster.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Quick selection buttons */}
        <div className="px-6 py-2 border-b border-gray-200 flex items-center gap-2">
          <button
            onClick={selectAll}
            disabled={isDownloading}
            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
          >
            Select All ({selectableCount})
          </button>
          <button
            onClick={selectNone}
            disabled={isDownloading}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            Select None
          </button>
          <button
            onClick={selectMissing}
            disabled={isDownloading}
            className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
          >
            Select Missing
          </button>
        </div>

        {/* Pilot table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <PilotDownloadTable
            participants={participants}
            taskId={task.id}
            source={source}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            downloadStatus={downloadStatus}
            disabled={isDownloading}
          />
        </div>

        {/* Progress indicator */}
        {activeProgress.visible && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <DownloadProgressIndicator
              progress={activeProgress}
              source={source}
            />
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="px-6 py-2 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedIds.size} of {participants.length} selected
          </div>
          <div className="flex gap-3">
            {isDownloading ? (
              <button
                onClick={cancelDownload}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!canDownload}
                  className={`px-4 py-2 text-sm font-medium text-white rounded disabled:opacity-50 ${
                    source === "xcontest"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : source === "volandoo"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  Download ({selectedIds.size})
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDownloadPanel;
