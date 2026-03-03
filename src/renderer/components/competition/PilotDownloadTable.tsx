/**
 * Pilot download table component
 *
 * Table for selecting pilots to download tracks for with status indicators
 */

import React from "react";
import type { Participant } from "@main/scoring/types";
import type {
  PilotDownloadStatus,
  DownloadStatus,
} from "@renderer/hooks/useCompetitionDownload";

export type DownloadSource = "xcontest" | "volandoo" | "flymaster" | "all";

interface PilotDownloadTableProps {
  participants: Participant[];
  taskId: string;
  source: DownloadSource;
  selectedIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
  downloadStatus: Map<number, PilotDownloadStatus>;
  disabled?: boolean;
}

const getStatusIcon = (status?: DownloadStatus): React.ReactNode => {
  switch (status) {
    case "success":
      return (
        <svg
          className="w-4 h-4 text-green-600"
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
      );
    case "downloading":
      return (
        <svg
          className="w-4 h-4 text-blue-600 animate-spin"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    case "error":
      return (
        <svg
          className="w-4 h-4 text-red-600"
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
      );
    case "no_track":
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    default:
      return null;
  }
};

const getStatusText = (
  participant: Participant,
  taskId: string,
  source: DownloadSource,
  downloadStatusEntry?: PilotDownloadStatus
): { text: string; color: string } => {
  // Check if participant has a track for this task
  const hasTrack = participant.taskTracks?.some((t) => t.taskId === taskId);

  // Check if participant has the required ID for this source
  const hasSourceId =
    source === "xcontest"
      ? !!participant.xcontest
      : source === "volandoo"
        ? !!participant.volandoo
        : true; // Flymaster doesn't require specific ID

  if (!hasSourceId) {
    return { text: "No ID", color: "text-gray-400" };
  }

  if (downloadStatusEntry) {
    switch (downloadStatusEntry.status) {
      case "downloading":
        return { text: "Downloading...", color: "text-blue-600" };
      case "success":
        return { text: "Downloaded", color: "text-green-600" };
      case "error":
        return {
          text: downloadStatusEntry.error || "Error",
          color: "text-red-600",
        };
      case "no_track":
        return { text: "No track found", color: "text-yellow-600" };
    }
  }

  if (hasTrack) {
    return { text: "Has Track", color: "text-green-600" };
  }

  return { text: "Ready", color: "text-gray-600" };
};

const PilotDownloadTable: React.FC<PilotDownloadTableProps> = ({
  participants,
  taskId,
  source,
  selectedIds,
  onSelectionChange,
  downloadStatus,
  disabled = false,
}) => {
  const toggleSelection = (participantId: number) => {
    if (disabled) return;

    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    // Don't allow selection if participant doesn't have required ID
    const hasSourceId =
      source === "xcontest"
        ? !!participant.xcontest
        : source === "volandoo"
          ? !!participant.volandoo
          : true;

    if (!hasSourceId) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(participantId)) {
      newSelection.delete(participantId);
    } else {
      newSelection.add(participantId);
    }
    onSelectionChange(newSelection);
  };

  const getSourceId = (participant: Participant): string => {
    switch (source) {
      case "xcontest":
        return participant.xcontest || "-";
      case "volandoo":
        return participant.volandoo || "-";
      case "flymaster":
      case "all":
        return participant.id.toString();
    }
  };

  const getSourceLabel = (): string => {
    switch (source) {
      case "xcontest":
        return "XContest";
      case "volandoo":
        return "Volandoo";
      case "flymaster":
      case "all":
        return "Pilot ID";
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-10 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              <input
                type="checkbox"
                checked={
                  selectedIds.size > 0 &&
                  selectedIds.size ===
                    participants.filter((p) =>
                      source === "xcontest"
                        ? p.xcontest
                        : source === "volandoo"
                          ? p.volandoo
                          : true
                    ).length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    const allSelectable = participants
                      .filter((p) =>
                        source === "xcontest"
                          ? p.xcontest
                          : source === "volandoo"
                            ? p.volandoo
                            : true
                      )
                      .map((p) => p.id);
                    onSelectionChange(new Set(allSelectable));
                  } else {
                    onSelectionChange(new Set());
                  }
                }}
                disabled={disabled}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
            </th>
            <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              #
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Name
            </th>
            <th className="w-28 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              {getSourceLabel()}
            </th>
            <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {participants.map((participant) => {
            const statusEntry = downloadStatus.get(participant.id);
            const statusInfo = getStatusText(
              participant,
              taskId,
              source,
              statusEntry
            );
            const hasSourceId =
              source === "xcontest"
                ? !!participant.xcontest
                : source === "volandoo"
                  ? !!participant.volandoo
                  : true;
            const isSelectable = hasSourceId && !disabled;

            return (
              <tr
                key={participant.id}
                onClick={() => toggleSelection(participant.id)}
                className={`
                  ${isSelectable ? "cursor-pointer hover:bg-gray-50" : "opacity-50"}
                  ${selectedIds.has(participant.id) ? "bg-blue-50" : ""}
                  transition-colors
                `}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(participant.id)}
                    onChange={() => toggleSelection(participant.id)}
                    disabled={!isSelectable}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                </td>
                <td className="px-3 py-2 text-sm text-gray-500">
                  {participant.id}
                </td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900">
                  {participant.name}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500">
                  {getSourceId(participant)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(statusEntry?.status)}
                    <span className={`text-sm ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {participants.length === 0 && (
        <div className="text-center py-8 text-gray-500">No participants</div>
      )}
    </div>
  );
};

export default PilotDownloadTable;
