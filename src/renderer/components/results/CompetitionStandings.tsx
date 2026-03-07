/**
 * Competition standings component
 *
 * Displays overall competition ranking with FTV discards
 */

import React, { useMemo } from "react";
import type {
  CompetitionResult,
  TaskResult,
  TaskStandingScore,
  Participant,
} from "@main/scoring/types";

interface CompetitionStandingsProps {
  competitionResult: CompetitionResult | null;
  taskResults: TaskResult[];
  participants: Participant[];
  onRecalculate: () => void;
}

const CompetitionStandings: React.FC<CompetitionStandingsProps> = ({
  competitionResult,
  taskResults,
  participants,
  onRecalculate,
}) => {
  // Build participant lookup
  const participantMap = useMemo(() => {
    const map = new Map<number, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [participants]);

  // Build task lookup
  const taskMap = useMemo(() => {
    const map = new Map<string, TaskResult>();
    taskResults.forEach((t) => map.set(t.taskId, t));
    return map;
  }, [taskResults]);

  if (!competitionResult) {
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-gray-500 mb-4">
          {taskResults.length === 0
            ? "Score at least one task to view standings"
            : "Standings not yet calculated"}
        </p>
        {taskResults.length > 0 && (
          <button
            onClick={onRecalculate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Calculate Standings
          </button>
        )}
      </div>
    );
  }

  // Get task IDs in order
  const taskIds = taskResults.map((t) => t.taskId);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {competitionResult.scoredTaskCount} tasks scored
          {competitionResult.standings.length > 0 &&
            ` • ${competitionResult.standings.length} pilots`}
        </div>
        <button
          onClick={onRecalculate}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 flex items-center gap-1"
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
          Recalculate
        </button>
      </div>

      {/* Standings table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 w-12">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                ID
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-12 bg-gray-50 z-10 min-w-[150px]">
                Pilot
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                M/F
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Nation
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Glider
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Cat.
              </th>
              {taskIds.map((taskId) => {
                const task = taskMap.get(taskId);
                return (
                  <th
                    key={taskId}
                    className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]"
                  >
                    {task?.taskName || taskId}
                  </th>
                );
              })}
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] bg-gray-100">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {competitionResult.standings.map((standing) => {
              const participant = participantMap.get(standing.participantId);
              const gender =
                participant?.genre === "MALE"
                  ? "M"
                  : participant?.genre === "FEMALE"
                    ? "F"
                    : "";

              return (
                <tr key={standing.participantId} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    {standing.rank}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {standing.participantId}
                  </td>
                  <td className="px-3 py-2 text-sm sticky left-12 bg-white">
                    <div className="font-medium text-gray-900">
                      {participant?.name || `Pilot ${standing.participantId}`}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">{gender}</td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {participant?.nation || ""}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {participant?.glider || ""}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {participant?.gliderClass || ""}
                  </td>
                  {taskIds.map((taskId) => {
                    const score: TaskStandingScore | undefined =
                      standing.taskScores?.[taskId];
                    const countingPts = score?.countingPoints ?? 0;
                    const originalPts = score?.originalPoints ?? 0;
                    const isPartial =
                      originalPts !== countingPts && originalPts > 0;

                    return (
                      <td
                        key={taskId}
                        className="px-3 py-2 text-sm text-right text-gray-900"
                      >
                        {isPartial ? (
                          <span>
                            {countingPts.toFixed(1)}/
                            <s className="text-gray-400">
                              {originalPts.toFixed(1)}
                            </s>
                          </span>
                        ) : (
                          countingPts.toFixed(1)
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right bg-gray-50">
                    {standing.totalPoints.toFixed(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {competitionResult.standings.some((s) =>
        Object.values(s.taskScores ?? {}).some(
          (sc) =>
            sc.originalPoints !== sc.countingPoints && sc.originalPoints > 0
        )
      ) && (
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>
            5.2/<s>452.6</s>
          </span>
          <span>= Partially counted task (FTV)</span>
        </div>
      )}
    </div>
  );
};

export default CompetitionStandings;
