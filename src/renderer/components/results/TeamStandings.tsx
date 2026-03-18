import React, { useState, useMemo } from "react";
import type { TeamResult, Participant } from "@main/scoring/types";

interface TeamStandingsProps {
  teamResult: TeamResult | null;
  participants: Participant[];
  taskNames: Map<string, string>;
}

const TeamStandings: React.FC<TeamStandingsProps> = ({
  teamResult,
  participants,
  taskNames,
}) => {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const participantMap = useMemo(() => {
    const map = new Map<number, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [participants]);

  if (!teamResult) return null;

  if (teamResult.standings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No teams found for this classification.
      </div>
    );
  }

  const taskIds =
    teamResult.standings[0]?.taskScores.map((ts) => ts.taskId) ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                Team
              </th>
              {taskIds.map((taskId) => (
                <th
                  key={taskId}
                  className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]"
                >
                  {taskNames.get(taskId) || taskId}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] bg-gray-100">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamResult.standings.map((standing) => {
              const isExpanded = expandedTeam === standing.teamName;
              return (
                <React.Fragment key={standing.teamName}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedTeam(isExpanded ? null : standing.teamName)
                    }
                  >
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      {standing.rank}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      <span className="flex items-center gap-1">
                        <svg
                          className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        {standing.teamName}
                      </span>
                    </td>
                    {standing.taskScores.map((ts) => (
                      <td
                        key={ts.taskId}
                        className="px-3 py-2 text-sm text-right text-gray-900"
                      >
                        {ts.teamPoints.toFixed(1)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right bg-gray-50">
                      {standing.totalPoints.toFixed(0)}
                    </td>
                  </tr>
                  {/* Expanded member rows */}
                  {isExpanded &&
                    standing.taskScores[0]?.members.map((member) => {
                      const pilot = participantMap.get(member.participantId);
                      return (
                        <tr
                          key={member.participantId}
                          className="bg-gray-50/50"
                        >
                          <td className="px-3 py-1" />
                          <td className="px-3 py-1 text-xs text-gray-500 pl-8">
                            {pilot?.name || `Pilot ${member.participantId}`}
                          </td>
                          {standing.taskScores.map((ts) => {
                            const m = ts.members.find(
                              (x) => x.participantId === member.participantId
                            );
                            return (
                              <td
                                key={ts.taskId}
                                className={`px-3 py-1 text-xs text-right ${m?.counting ? "text-gray-700" : "text-gray-400"}`}
                              >
                                {m?.points.toFixed(1) ?? "-"}
                                {m && !m.counting && (
                                  <span className="text-gray-300 ml-0.5">
                                    *
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-1" />
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-400">
        Click a team row to expand members. * = not counting.
      </div>
    </div>
  );
};

export default TeamStandings;
