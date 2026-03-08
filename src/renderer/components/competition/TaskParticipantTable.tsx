import React, { useState, useMemo, useCallback } from "react";
import type {
  Participant,
  TaskDefinition,
  TaskStatus,
} from "@main/scoring/types";
import { useCompetitionDownload } from "@renderer/hooks/useCompetitionDownload";
import { useSettings } from "@renderer/context/settingsContext";
import IconDropdownButton from "@renderer/components/buttons/IconDropdownButton";
import Tooltip from "@renderer/components/buttons/Tooltip";
import TrackPreviewModal from "./TrackPreviewModal";

export interface IgcFileInfo {
  name: string;
  source: string;
  duration: string;
}

interface TaskParticipantTableProps {
  participants: Participant[];
  taskId: string;
  competitionId: string;
  task: TaskDefinition;
  onUpdateParticipant: (
    id: number,
    updates: Partial<Participant>
  ) => Promise<void>;
  pilotIgcFiles?: Map<number, IgcFileInfo[]>;
}

const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "NYP", label: "Not Yet Processed" },
  { value: "ABS", label: "Absent" },
  { value: "DNF", label: "Did Not Fly" },
  { value: "DF", label: "Did Fly" },
  { value: "GOAL", label: "Goal" },
];

const downloadIcon = (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const TaskParticipantTable: React.FC<TaskParticipantTableProps> = ({
  participants,
  taskId,
  competitionId,
  task,
  onUpdateParticipant,
  pilotIgcFiles,
}) => {
  const {
    settings: { debug },
    setDebug,
  } = useSettings();
  const [previewParticipant, setPreviewParticipant] =
    useState<Participant | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const getTrack = useCallback(
    (p: Participant) => p.taskTracks?.find((t) => t.taskId === taskId),
    [taskId]
  );

  const handleTrackDownloaded = useCallback(
    async (participantId: number, igcPath: string) => {
      const participant = participants.find((p) => p.id === participantId);
      if (!participant) return;

      const existingTracks = participant.taskTracks || [];
      const existingIndex = existingTracks.findIndex(
        (t) => t.taskId === taskId
      );

      const newTrack = {
        taskId,
        igcPath,
        uploadedAt: new Date().toISOString(),
        status: "NYP" as const,
      };

      let updatedTracks;
      if (existingIndex >= 0) {
        updatedTracks = [...existingTracks];
        updatedTracks[existingIndex] = {
          ...updatedTracks[existingIndex],
          ...newTrack,
        };
      } else {
        updatedTracks = [...existingTracks, newTrack];
      }
      await onUpdateParticipant(participantId, { taskTracks: updatedTracks });
    },
    [participants, taskId, onUpdateParticipant]
  );

  const { downloadXcontest, downloadVolandoo, isDownloading, downloadStatus } =
    useCompetitionDownload({
      competitionId,
      taskId,
      taskDate: task.date,
      participants,
      onTrackDownloaded: handleTrackDownloaded,
    });

  const { withTrack, withoutTrack } = useMemo(() => {
    const needle = search.toLowerCase();
    const filtered = needle
      ? participants.filter((p) => p.name.toLowerCase().includes(needle))
      : participants;
    const with_: Participant[] = [];
    const without_: Participant[] = [];
    for (const p of filtered) {
      const track = getTrack(p);
      if (track?.igcPath) {
        with_.push(p);
      } else {
        without_.push(p);
      }
    }
    return { withTrack: with_, withoutTrack: without_ };
  }, [participants, getTrack, search]);

  const handleStatusChange = useCallback(
    async (participant: Participant, newStatus: TaskStatus) => {
      const existingTracks = participant.taskTracks || [];
      const existingIndex = existingTracks.findIndex(
        (t) => t.taskId === taskId
      );

      let updatedTracks;
      if (existingIndex >= 0) {
        updatedTracks = [...existingTracks];
        updatedTracks[existingIndex] = {
          ...updatedTracks[existingIndex],
          status: newStatus,
        };
      } else {
        // Create stub entry
        updatedTracks = [...existingTracks, { taskId, status: newStatus }];
      }
      await onUpdateParticipant(participant.id, { taskTracks: updatedTracks });
    },
    [taskId, onUpdateParticipant]
  );

  const handleDelete = useCallback(
    async (participant: Participant) => {
      const track = getTrack(participant);
      if (!track?.igcPath) return;

      if (!window.confirm(`Delete track for ${participant.name}?`)) return;

      setDeletingIds((prev) => new Set(prev).add(participant.id));
      try {
        await window.tracks.deleteIGCs(track.igcPath);
      } catch {
        // File may already be gone
      }

      const updatedTracks = (participant.taskTracks || []).filter(
        (t) => t.taskId !== taskId
      );
      await onUpdateParticipant(participant.id, { taskTracks: updatedTracks });
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(participant.id);
        return next;
      });
    },
    [getTrack, taskId, onUpdateParticipant]
  );

  const handleDownload = useCallback(
    async (participant: Participant, source: "xcontest" | "volandoo") => {
      if (source === "xcontest") {
        await downloadXcontest([participant.id]);
      } else {
        await downloadVolandoo([participant.id]);
      }
    },
    [downloadXcontest, downloadVolandoo]
  );

  const renderRow = (p: Participant) => {
    const track = getTrack(p);
    const hasIgc = !!track?.igcPath;
    const status = track?.status || "NYP";
    const canDownload = (!!p.xcontest || !!p.volandoo) && !isDownloading;
    const pilotDownloadStatus = downloadStatus.get(p.id);
    const isDownloadingPilot = pilotDownloadStatus?.status === "downloading";

    return (
      <tr key={p.id} className="hover:bg-gray-50">
        <td className="px-3 py-2 text-sm text-gray-500">{p.id}</td>
        <td className="px-3 py-2 text-sm font-medium text-gray-900">
          {p.name}
        </td>
        <td className="px-3 py-2 text-sm text-gray-600">{p.nation || "—"}</td>
        <td className="px-3 py-2 text-sm text-gray-600">{p.glider || "—"}</td>
        <td className="px-3 py-2 text-sm text-gray-600">
          {p.gliderClass || "—"}
        </td>
        <td className="px-3 py-2 text-sm text-gray-600 text-center">
          {p.genre === "MALE" ? "M" : p.genre === "FEMALE" ? "F" : "—"}
        </td>
        <td className="px-3 py-2">
          <select
            value={status}
            onChange={(e) =>
              handleStatusChange(p, e.target.value as TaskStatus)
            }
            className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white"
          >
            {TASK_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2 text-sm text-gray-600">{p.xcontest || "—"}</td>
        <td className="px-3 py-2 text-sm text-gray-600">{p.volandoo || "—"}</td>
        <td className="px-3 py-2 text-center">
          {(() => {
            const files = pilotIgcFiles?.get(p.id) || [];
            const count = files.length;
            const hasMultiple = count > 1;

            const badge = (
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  hasMultiple
                    ? "text-amber-600"
                    : hasIgc
                      ? "text-green-600"
                      : count > 0
                        ? "text-amber-600"
                        : "text-gray-400"
                }`}
              >
                {(hasIgc || count > 0) && (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {hasIgc
                  ? `IGC${hasMultiple ? ` (${count})` : ""}`
                  : count > 0
                    ? `${count} IGC${count > 1 ? "s" : ""}`
                    : "—"}
              </span>
            );

            if (count > 1) {
              return (
                <Tooltip
                  content={
                    <div className="space-y-1">
                      <div className="font-medium mb-1">
                        {count} IGC files found:
                      </div>
                      {files.map((f, i) => (
                        <div key={i}>
                          {f.source} — {f.duration}
                        </div>
                      ))}
                    </div>
                  }
                >
                  {badge}
                </Tooltip>
              );
            }
            return badge;
          })()}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            {/* Preview */}
            <button
              onClick={() => setPreviewParticipant(p)}
              disabled={!hasIgc && !pilotIgcFiles?.get(p.id)?.length}
              title="Preview track"
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>

            {/* Download */}
            {isDownloadingPilot ? (
              <span className="p-1 text-gray-600">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </span>
            ) : p.xcontest && p.volandoo && canDownload ? (
              <IconDropdownButton
                icon={downloadIcon}
                title="Download track"
                options={[
                  { label: "XContest", value: "xcontest" },
                  { label: "Volandoo", value: "volandoo" },
                ]}
                onSelect={(v) =>
                  handleDownload(p, v as "xcontest" | "volandoo")
                }
              />
            ) : (
              <button
                onClick={() =>
                  handleDownload(p, p.xcontest ? "xcontest" : "volandoo")
                }
                disabled={!canDownload}
                title={
                  !p.xcontest && !p.volandoo
                    ? "No XContest/Volandoo ID"
                    : `Download from ${p.xcontest ? "XContest" : "Volandoo"}`
                }
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
              >
                {downloadIcon}
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => handleDelete(p)}
              disabled={!hasIgc || deletingIds.has(p.id)}
              title="Delete track"
              className="p-1 rounded hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 hover:text-red-600"
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
        </td>
      </tr>
    );
  };

  const trackCount = withTrack.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <span>Debug downloads</span>
          <button
            type="button"
            role="switch"
            aria-checked={debug}
            onClick={() => setDebug(!debug)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
              debug ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                debug ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Nation
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Glider
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Cat.
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                M/F
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                XContest
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Volandoo
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                Track
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {withTrack.map(renderRow)}
            {withTrack.length > 0 && withoutTrack.length > 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50 font-medium"
                >
                  Without track ({withoutTrack.length})
                </td>
              </tr>
            )}
            {withoutTrack.map(renderRow)}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-sm text-gray-500 px-3">
        {trackCount} of {participants.length} pilots have tracks
      </div>

      {/* Track preview modal */}
      {previewParticipant &&
        (() => {
          const files = pilotIgcFiles?.get(previewParticipant.id) || [];
          const track = getTrack(previewParticipant);
          // Fallback: if folder scan hasn't run but pilot has an assigned track
          const fallback: IgcFileInfo[] =
            files.length === 0 && track?.igcPath
              ? [
                  {
                    name: track.igcPath.split("/").pop()!,
                    source: "assigned",
                    duration: "",
                  },
                ]
              : files;
          return (
            <TrackPreviewModal
              isOpen
              onClose={() => setPreviewParticipant(null)}
              participant={previewParticipant}
              task={task}
              competitionId={competitionId}
              igcFiles={fallback}
            />
          );
        })()}
    </div>
  );
};

export default TaskParticipantTable;
