/**
 * Team scorer.
 *
 * Groups pilots by a shared attribute and sums the best N pilots' scores
 * per task. Matches FS GAP.CreateTeamResults() (GAP.cs:1772-1867).
 */

import type {
  Participant,
  TaskResult,
  TeamDefinition,
  TeamMemberScore,
  TeamResult,
  TeamStanding,
  TeamTaskScore,
} from "../types";

/**
 * Resolves the team attribute value for a participant.
 */
function getTeamValue(participant: Participant, attributeName: string): string {
  if (attributeName.startsWith("ca:")) {
    const key = attributeName.substring(3);
    return participant.customAttributes?.[key] ?? "";
  }

  switch (attributeName) {
    case "nat_code_ioc":
      return participant.nation ?? "";
    case "club":
      return participant.club ?? "";
    default:
      return "";
  }
}

/**
 * Round to N decimals using "away from zero" rounding (matching FS MidpointRounding.AwayFromZero).
 */
function roundAwayFromZero(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor + Number.EPSILON) / factor;
}

/**
 * Calculate team results for a team definition across all scored tasks.
 */
export function calculateTeamResults(
  taskResults: TaskResult[],
  participants: Participant[],
  teamDef: TeamDefinition,
  competitionId: string
): TeamResult {
  // Group participants by team name
  const teamMembers = new Map<string, Participant[]>();
  for (const p of participants) {
    const teamName = getTeamValue(p, teamDef.attributeName);
    if (!teamName) continue;

    if (!teamMembers.has(teamName)) {
      teamMembers.set(teamName, []);
    }
    teamMembers.get(teamName)!.push(p);
  }

  // Build pilot scores index: pilotId -> taskId -> points
  const pilotScores = new Map<number, Map<string, number>>();
  for (const tr of taskResults) {
    for (const pr of tr.pilotResults) {
      if (!pilotScores.has(pr.pilotId)) {
        pilotScores.set(pr.pilotId, new Map());
      }
      pilotScores.get(pr.pilotId)!.set(tr.taskId, pr.totalPoints);
    }
  }

  // Calculate team standings
  const standings: TeamStanding[] = [];

  for (const [teamName, members] of teamMembers) {
    let totalPoints = 0;
    const taskScores: TeamTaskScore[] = [];

    for (const tr of taskResults) {
      // Get each member's score for this task
      const memberScores: { participantId: number; points: number }[] = [];
      for (const member of members) {
        const points = pilotScores.get(member.id)?.get(tr.taskId) ?? 0;
        memberScores.push({ participantId: member.id, points });
      }

      // Sort by points descending
      memberScores.sort((a, b) => b.points - a.points);

      // Mark counting members (firstToCount is 1-based)
      const startIdx = teamDef.firstToCount - 1;
      const endIdx = startIdx + teamDef.numberToCount;
      let taskTeamPoints = 0;

      const teamMemberScores: TeamMemberScore[] = memberScores.map(
        (ms, idx) => {
          const counting = idx >= startIdx && idx < endIdx;
          if (counting) {
            taskTeamPoints += ms.points;
          }
          return {
            participantId: ms.participantId,
            points: ms.points,
            counting,
          };
        }
      );

      totalPoints += taskTeamPoints;

      taskScores.push({
        taskId: tr.taskId,
        teamPoints: taskTeamPoints,
        members: teamMemberScores,
      });
    }

    totalPoints = roundAwayFromZero(totalPoints, 1);

    standings.push({
      teamName,
      rank: 0, // assigned below
      totalPoints,
      taskScores,
    });
  }

  // Sort by total points descending and assign ranks
  standings.sort((a, b) => b.totalPoints - a.totalPoints);

  let currentRank = 0;
  let prevPoints = -1;
  for (let i = 0; i < standings.length; i++) {
    if (standings[i].totalPoints !== prevPoints) {
      currentRank = i + 1;
      prevPoints = standings[i].totalPoints;
    }
    standings[i].rank = currentRank;
  }

  return {
    competitionId,
    teamDefinitionId: teamDef.id,
    teamDefinitionName: teamDef.name,
    scoredAt: new Date().toISOString(),
    standings,
  };
}
