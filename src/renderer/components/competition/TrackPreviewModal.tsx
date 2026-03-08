import React, { useState, useEffect } from "react";
import type { Participant, TaskDefinition } from "@main/scoring/types";
import type { TrackLayer } from "./TaskMap";
import type { IgcFileInfo } from "./TaskParticipantTable";
import TaskMap, { TRACK_COLORS } from "./TaskMap";

interface TrackPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant;
  task: TaskDefinition;
  competitionId: string;
  igcFiles: IgcFileInfo[];
}

const TrackPreviewModal: React.FC<TrackPreviewModalProps> = ({
  isOpen,
  onClose,
  participant,
  task,
  competitionId,
  igcFiles,
}) => {
  const [tracks, setTracks] = useState<TrackLayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || igcFiles.length === 0) return;
    setLoading(true);
    setError(null);
    setTracks(null);

    (async () => {
      try {
        const igcFolder = await window.scoring.getCompetitionIgcFolder(
          competitionId,
          task.id
        );

        const results = await Promise.all(
          igcFiles.map(async (file) => {
            const fullPath = `${igcFolder}/${file.name}`;
            const fixes = await window.scoring.readIgc(fullPath);
            return {
              label: `${file.source} (${file.duration})`,
              fixes,
            };
          })
        );

        setTracks(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read IGC");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, igcFiles, competitionId, task.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {participant.name}
            </h3>
            <p className="text-sm text-gray-500">{task.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
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

        {/* Body */}
        <div className="flex-1 p-4 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500">Loading track...</div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-96">
              <div className="text-red-500">{error}</div>
            </div>
          )}
          {tracks && (
            <>
              <TaskMap
                turnpoints={task.turnpoints}
                shortestRoute={task.shortestRoute}
                tracks={tracks}
              />
              {/* Legend */}
              {tracks.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {tracks.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-sm text-gray-700"
                    >
                      <span
                        className="inline-block w-4 h-0.5 rounded"
                        style={{
                          backgroundColor:
                            t.color || TRACK_COLORS[i % TRACK_COLORS.length],
                        }}
                      />
                      {t.label}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackPreviewModal;
