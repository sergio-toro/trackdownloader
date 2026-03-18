import { describe, it, expect } from "vitest";
import { calculateTeamResults } from "../../src/main/scoring/scoring/teamScorer";
import type {
  Participant,
  PilotResult,
  TaskResult,
  TeamDefinition,
} from "../../src/main/scoring/types";

function makePilotResult(pilotId: number, totalPoints: number): PilotResult {
  return {
    pilotId,
    rank: 0,
    distance: 50000,
    time: 3600,
    reachedGoal: true,
    reachedESS: true,
    distancePoints: totalPoints * 0.3,
    timePoints: totalPoints * 0.4,
    arrivalPoints: 0,
    leadingPoints: totalPoints * 0.3,
    departurePoints: 0,
    penalties: [],
    penaltyPoints: 0,
    totalPoints,
  };
}

function makeTaskResult(
  taskId: string,
  pilotResults: PilotResult[]
): TaskResult {
  return {
    taskId,
    taskName: `Task ${taskId}`,
    taskDate: "2024-01-01",
    scoredAt: new Date().toISOString(),
    formula: "GAP2023",
    timeValidity: 1,
    launchValidity: 1,
    distanceValidity: 1,
    stopValidity: 1,
    dayQuality: 1,
    availablePoints: {
      totalAvailable: 1000,
      distanceAvailable: 300,
      timeAvailable: 400,
      arrivalAvailable: 0,
      leadingAvailable: 300,
      departureAvailable: 0,
    },
    statistics: {
      pilotsPresent: pilotResults.length,
      pilotsFlying: pilotResults.length,
      pilotsLaunched: pilotResults.length,
      pilotsLandedBeforeDeadline: pilotResults.length,
      pilotsInGoal: pilotResults.length,
      pilotsReachedESS: pilotResults.length,
      bestDistance: 100000,
      taskDistance: 100000,
      sumOfFlownDistancesOverMin: 500000,
      maxDistanceOverMin: 100000,
      minDistance: 7000,
      bestTime: 3000,
      bestFinishTime: 0,
      lastFinishTime: 0,
      sumOfLeadingCoeffs: 5,
      smallestLeadingCoeff: 0.5,
      leadingWeightFactor: 1,
      nominalDistance: 80000,
      nominalTime: 5400,
      nominalGoal: 0.2,
      nominalLaunch: 0.95,
    },
    pilotResults,
  };
}

function makeParticipant(id: number, nation: string): Participant {
  return {
    id,
    name: `Pilot ${id}`,
    nation,
    status: "Confirmed",
  };
}

describe("teamScorer", () => {
  it("should group pilots by nation and count best N", () => {
    const participants = [
      makeParticipant(1, "ESP"),
      makeParticipant(2, "ESP"),
      makeParticipant(3, "ESP"),
      makeParticipant(4, "FRA"),
      makeParticipant(5, "FRA"),
      makeParticipant(6, "FRA"),
    ];

    const taskResults = [
      makeTaskResult("t1", [
        makePilotResult(1, 900),
        makePilotResult(2, 800),
        makePilotResult(3, 500),
        makePilotResult(4, 700),
        makePilotResult(5, 600),
        makePilotResult(6, 400),
      ]),
    ];

    const teamDef: TeamDefinition = {
      id: "nation-2-1",
      name: "Nation",
      attributeName: "nat_code_ioc",
      numberToCount: 2,
      firstToCount: 1,
    };

    const result = calculateTeamResults(
      taskResults,
      participants,
      teamDef,
      "comp-1"
    );

    expect(result.standings).toHaveLength(2);
    // ESP: best 2 = 900 + 800 = 1700
    // FRA: best 2 = 700 + 600 = 1300
    const esp = result.standings.find((s) => s.teamName === "ESP")!;
    const fra = result.standings.find((s) => s.teamName === "FRA")!;

    expect(esp.totalPoints).toBe(1700);
    expect(esp.rank).toBe(1);
    expect(fra.totalPoints).toBe(1300);
    expect(fra.rank).toBe(2);
  });

  it("should mark counting members correctly", () => {
    const participants = [
      makeParticipant(1, "ESP"),
      makeParticipant(2, "ESP"),
      makeParticipant(3, "ESP"),
    ];

    const taskResults = [
      makeTaskResult("t1", [
        makePilotResult(1, 900),
        makePilotResult(2, 800),
        makePilotResult(3, 500),
      ]),
    ];

    const teamDef: TeamDefinition = {
      id: "nation-2-1",
      name: "Nation",
      attributeName: "nat_code_ioc",
      numberToCount: 2,
      firstToCount: 1,
    };

    const result = calculateTeamResults(
      taskResults,
      participants,
      teamDef,
      "comp-1"
    );

    const esp = result.standings[0];
    const t1 = esp.taskScores[0];

    // Best 2 should be counting
    const countingMembers = t1.members.filter((m) => m.counting);
    expect(countingMembers).toHaveLength(2);
    expect(countingMembers.map((m) => m.points).sort((a, b) => b - a)).toEqual([
      900, 800,
    ]);

    // Third should not be counting
    const nonCounting = t1.members.filter((m) => !m.counting);
    expect(nonCounting).toHaveLength(1);
    expect(nonCounting[0].points).toBe(500);
  });

  it("should handle multiple tasks", () => {
    const participants = [
      makeParticipant(1, "ESP"),
      makeParticipant(2, "ESP"),
      makeParticipant(3, "FRA"),
      makeParticipant(4, "FRA"),
    ];

    const taskResults = [
      makeTaskResult("t1", [
        makePilotResult(1, 900),
        makePilotResult(2, 800),
        makePilotResult(3, 700),
        makePilotResult(4, 600),
      ]),
      makeTaskResult("t2", [
        makePilotResult(1, 500),
        makePilotResult(2, 600),
        makePilotResult(3, 900),
        makePilotResult(4, 800),
      ]),
    ];

    const teamDef: TeamDefinition = {
      id: "nation-1-1",
      name: "Nation",
      attributeName: "nat_code_ioc",
      numberToCount: 1,
      firstToCount: 1,
    };

    const result = calculateTeamResults(
      taskResults,
      participants,
      teamDef,
      "comp-1"
    );

    // ESP: task1 best=900, task2 best=600, total=1500
    // FRA: task1 best=700, task2 best=900, total=1600
    const esp = result.standings.find((s) => s.teamName === "ESP")!;
    const fra = result.standings.find((s) => s.teamName === "FRA")!;

    expect(fra.totalPoints).toBe(1600);
    expect(fra.rank).toBe(1);
    expect(esp.totalPoints).toBe(1500);
    expect(esp.rank).toBe(2);
  });

  it("should handle firstToCount > 1", () => {
    const participants = [
      makeParticipant(1, "ESP"),
      makeParticipant(2, "ESP"),
      makeParticipant(3, "ESP"),
    ];

    const taskResults = [
      makeTaskResult("t1", [
        makePilotResult(1, 900),
        makePilotResult(2, 700),
        makePilotResult(3, 500),
      ]),
    ];

    // Count 1 pilot starting from rank 2 (skip the best)
    const teamDef: TeamDefinition = {
      id: "nation-1-2",
      name: "Nation",
      attributeName: "nat_code_ioc",
      numberToCount: 1,
      firstToCount: 2,
    };

    const result = calculateTeamResults(
      taskResults,
      participants,
      teamDef,
      "comp-1"
    );

    const esp = result.standings[0];
    // Should count the 2nd best (700), not the 1st (900)
    expect(esp.totalPoints).toBe(700);
  });

  it("should skip pilots with empty team attribute", () => {
    const participants = [
      makeParticipant(1, "ESP"),
      makeParticipant(2, ""), // No nation
      { id: 3, name: "Pilot 3", status: "Confirmed" as const }, // No nation field
    ];

    const taskResults = [
      makeTaskResult("t1", [
        makePilotResult(1, 900),
        makePilotResult(2, 800),
        makePilotResult(3, 700),
      ]),
    ];

    const teamDef: TeamDefinition = {
      id: "nation-3-1",
      name: "Nation",
      attributeName: "nat_code_ioc",
      numberToCount: 3,
      firstToCount: 1,
    };

    const result = calculateTeamResults(
      taskResults,
      participants,
      teamDef,
      "comp-1"
    );

    // Only ESP team, others have no nation
    expect(result.standings).toHaveLength(1);
    expect(result.standings[0].teamName).toBe("ESP");
  });

  it("should assign equal ranks for equal points", () => {
    const participants = [makeParticipant(1, "ESP"), makeParticipant(2, "FRA")];

    const taskResults = [
      makeTaskResult("t1", [makePilotResult(1, 500), makePilotResult(2, 500)]),
    ];

    const teamDef: TeamDefinition = {
      id: "nation-1-1",
      name: "Nation",
      attributeName: "nat_code_ioc",
      numberToCount: 1,
      firstToCount: 1,
    };

    const result = calculateTeamResults(
      taskResults,
      participants,
      teamDef,
      "comp-1"
    );

    expect(result.standings[0].rank).toBe(1);
    expect(result.standings[1].rank).toBe(1);
  });

  it("should work with custom attributes for team grouping", () => {
    const participants: Participant[] = [
      {
        id: 1,
        name: "Pilot 1",
        status: "Confirmed",
        customAttributes: { team: "Alpha" },
      },
      {
        id: 2,
        name: "Pilot 2",
        status: "Confirmed",
        customAttributes: { team: "Alpha" },
      },
      {
        id: 3,
        name: "Pilot 3",
        status: "Confirmed",
        customAttributes: { team: "Beta" },
      },
    ];

    const taskResults = [
      makeTaskResult("t1", [
        makePilotResult(1, 900),
        makePilotResult(2, 800),
        makePilotResult(3, 700),
      ]),
    ];

    const teamDef: TeamDefinition = {
      id: "team-2-1",
      name: "Team",
      attributeName: "ca:team",
      numberToCount: 2,
      firstToCount: 1,
    };

    const result = calculateTeamResults(
      taskResults,
      participants,
      teamDef,
      "comp-1"
    );

    expect(result.standings).toHaveLength(2);
    const alpha = result.standings.find((s) => s.teamName === "Alpha")!;
    const beta = result.standings.find((s) => s.teamName === "Beta")!;

    expect(alpha.totalPoints).toBe(1700); // 900 + 800
    expect(beta.totalPoints).toBe(700); // only 1 member
  });
});
