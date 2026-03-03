import React from "react";
import type { Participant } from "@main/scoring/types";

interface TaskParticipantTableProps {
  participants: Participant[];
  taskId: string;
}

const TaskParticipantTable: React.FC<TaskParticipantTableProps> = ({
  participants,
  taskId,
}) => {
  const hasTrack = (p: Participant) =>
    p.taskTracks?.some((t) => t.taskId === taskId) ?? false;

  const trackCount = participants.filter(hasTrack).length;

  return (
    <div>
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
                Glider
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                Track
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {participants.map((p) => {
              const has = hasTrack(p);
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-500">{p.id}</td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {p.glider || "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {has ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Has Track
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
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
                            d="M20 12H4"
                          />
                        </svg>
                        No Track
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-sm text-gray-500 px-3">
        {trackCount} of {participants.length} pilots have tracks
      </div>
    </div>
  );
};

export default TaskParticipantTable;
