import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import fs from "fs";
import { calculateCompetitionStandings } from "@main/scoring/scoring/ftvCalculator";
import type { TaskResult } from "@main/scoring/types/results";
import type { ScoringFormulaConfig } from "@main/scoring/types/formula";

const FIXTURES = path.resolve(__dirname, "../fixtures/lliga-catalana");

const TASK_ID_MAP: Record<string, string> = {
  task10: "bc852108-262d-432c-a013-cbf602904a97",
  task11: "0d27cc2d-518a-48e5-9c06-31880823ce71",
  task12: "a4e2c6ad-9f94-4a3f-b109-3eb886359b4b",
};

// Reverse map: UUID -> FSDB task number
const UUID_TO_FSDB: Record<string, string> = Object.fromEntries(
  Object.entries(TASK_ID_MAP).map(([name, uuid]) => [
    uuid,
    name.replace("task", ""),
  ])
);

interface ExpectedStanding {
  pilotId: number;
  rank: number;
  totalPoints: number;
  taskPoints: Record<string, { points: number; countingPoints: number }>;
}

interface StandingsFixture {
  ftvFactor: number;
  useBestScoreForFtvValidity: boolean;
  standings: ExpectedStanding[];
}

function loadFixture<T>(relativePath: string): T {
  const fullPath = path.join(FIXTURES, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

describe("Competition Standings (FTV)", () => {
  describe("3-task competition with FTV=0.33", () => {
    let standings: ReturnType<
      typeof calculateCompetitionStandings
    >["standings"];
    let expectedFixture: StandingsFixture;

    beforeAll(() => {
      const taskResults: TaskResult[] = ["task10", "task11", "task12"].map(
        (name) => loadFixture<TaskResult>(`expected-results/${name}.json`)
      );

      const formula = loadFixture<ScoringFormulaConfig>("formula.json");
      formula.ftvFactor = 0.33;
      formula.useBestScoreForFtvValidity = true;

      expectedFixture = loadFixture<StandingsFixture>(
        "expected-results/standings-3tasks.json"
      );

      const result = calculateCompetitionStandings(taskResults, [], formula);
      standings = result.standings;
    });

    it("should produce correct number of standings", () => {
      expect(standings.length).toBe(expectedFixture.standings.length);
    });

    it("should produce correct total points for each pilot", () => {
      const expectedByPilot = new Map(
        expectedFixture.standings.map((s) => [s.pilotId, s])
      );

      for (const standing of standings) {
        const exp = expectedByPilot.get(standing.participantId);
        if (!exp) continue;
        expect(
          Math.abs(standing.totalPoints - exp.totalPoints),
          `Pilot ${standing.participantId}: got ${standing.totalPoints}, expected ${exp.totalPoints}`
        ).toBeLessThanOrEqual(1);
      }
    });

    it("should produce correct ranks", () => {
      const expectedByPilot = new Map(
        expectedFixture.standings.map((s) => [s.pilotId, s])
      );

      for (const standing of standings) {
        const exp = expectedByPilot.get(standing.participantId);
        if (!exp) continue;
        expect(standing.rank, `Pilot ${standing.participantId}`).toBe(exp.rank);
      }
    });

    it("should produce correct counting points per task", () => {
      const expectedByPilot = new Map(
        expectedFixture.standings.map((s) => [s.pilotId, s])
      );

      for (const standing of standings) {
        const exp = expectedByPilot.get(standing.participantId);
        if (!exp) continue;

        for (const [taskUuid, countingPoints] of Object.entries(
          standing.taskPoints
        )) {
          const fsdbTaskId = UUID_TO_FSDB[taskUuid];
          if (!fsdbTaskId || !exp.taskPoints[fsdbTaskId]) continue;

          const expectedCounting = exp.taskPoints[fsdbTaskId].countingPoints;
          expect(
            Math.abs(countingPoints - expectedCounting),
            `Pilot ${standing.participantId} task ${fsdbTaskId}: got ${countingPoints}, expected ${expectedCounting}`
          ).toBeLessThanOrEqual(0.2);
        }
      }
    });
  });

  describe("no FTV (ftvFactor=0)", () => {
    it("should sum all task points without discarding", () => {
      const taskResults: TaskResult[] = ["task10", "task11", "task12"].map(
        (name) => loadFixture<TaskResult>(`expected-results/${name}.json`)
      );

      const formula = loadFixture<ScoringFormulaConfig>("formula.json");
      formula.ftvFactor = 0;

      const result = calculateCompetitionStandings(taskResults, [], formula);

      // Build pilot raw totals from task results
      const rawTotals = new Map<number, number>();
      for (const taskResult of taskResults) {
        for (const pr of taskResult.pilotResults) {
          rawTotals.set(
            pr.pilotId,
            (rawTotals.get(pr.pilotId) || 0) + pr.totalPoints
          );
        }
      }

      for (const standing of result.standings) {
        const rawTotal = rawTotals.get(standing.participantId) || 0;
        // Rounding to 0 decimals can cause up to ±1 difference
        expect(Math.abs(standing.totalPoints - rawTotal)).toBeLessThanOrEqual(
          1
        );
      }
    });
  });

  describe("single task with FTV", () => {
    it("should apply proportional FTV to single task", () => {
      const taskResults: TaskResult[] = [
        loadFixture<TaskResult>("expected-results/task11.json"),
      ];

      const formula = loadFixture<ScoringFormulaConfig>("formula.json");
      formula.ftvFactor = 0.33;
      formula.useBestScoreForFtvValidity = true;

      const result = calculateCompetitionStandings(taskResults, [], formula);

      // With 1 task and FTV=0.33, target = maxPoints * 0.67
      // Each pilot gets points * (target / maxPoints) = points * 0.67
      const maxPoints = Math.max(
        ...taskResults[0].pilotResults.map((r) => r.totalPoints)
      );
      const ftvTarget = maxPoints * (1 - 0.33);

      for (const standing of result.standings) {
        const rawPoints =
          taskResults[0].pilotResults.find(
            (r) => r.pilotId === standing.participantId
          )?.totalPoints || 0;
        const expectedPoints = rawPoints * (ftvTarget / maxPoints);
        expect(standing.totalPoints).toBeCloseTo(expectedPoints, 0);
      }
    });
  });
});
