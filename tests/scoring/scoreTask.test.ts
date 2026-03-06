import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import fs from "fs";
import { analyzeFlightForTask } from "@main/scoring/analysis";
import { scoreTask } from "@main/scoring/scoring";
import { calculateTaskDistances } from "@main/scoring/geo/shortestRoute";
import type { TaskDefinition } from "@main/scoring/types/task";
import type { ScoringFormulaConfig } from "@main/scoring/types/formula";
import type { FlightAnalysis } from "@main/scoring/types/flightAnalysis";
import type { TaskResult, PilotResult } from "@main/scoring/types/results";

const FIXTURES = path.resolve(__dirname, "../fixtures/lliga-catalana");

interface ExpectedTaskResult extends TaskResult {
  fsStats?: {
    taskDistanceKm: number;
    ssDistanceKm: number;
    goalRatio: number;
    distanceWeight: number;
    timeWeight: number;
    leadingWeight: number;
  };
}

interface Participant {
  id: number;
  name: string;
  status: string;
  taskIds: string[];
}

const TASK_ID_MAP: Record<string, string> = {
  task10: "bc852108-262d-432c-a013-cbf602904a97",
  task11: "0d27cc2d-518a-48e5-9c06-31880823ce71",
  task12: "a4e2c6ad-9f94-4a3f-b109-3eb886359b4b",
};

function loadFixture<T>(relativePath: string): T {
  const fullPath = path.join(FIXTURES, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

/**
 * Build pilotId -> igcPath map by scanning IGC directory.
 * IGC files are named like "Name.PILOTID.igc".
 */
function buildIgcMap(igcDir: string): Map<number, string> {
  const map = new Map<number, string>();
  const files = fs.readdirSync(igcDir);
  for (const file of files) {
    if (!file.endsWith(".igc")) continue;
    const match = file.match(/\.(\d+)\.igc$/);
    if (match) {
      map.set(parseInt(match[1], 10), path.join(igcDir, file));
    }
  }
  return map;
}

async function analyzeAndScoreTask(taskName: string): Promise<{
  result: TaskResult;
  expected: ExpectedTaskResult;
}> {
  const task = loadFixture<TaskDefinition>(`tasks/${taskName}.json`);
  const formula = loadFixture<ScoringFormulaConfig>("formula.json");
  const participants = loadFixture<Participant[]>("participants.json");
  const expected = loadFixture<ExpectedTaskResult>(
    `expected-results/${taskName}.json`
  );

  // Recalculate task distances (same as IPC handler does)
  const distances = calculateTaskDistances(
    task.turnpoints,
    task.ssIndex,
    task.esIndex
  );
  task.taskDistance = distances.taskDistance;
  task.speedSectionDistance = distances.speedSectionDistance;
  task.launchToEssDistance = distances.launchToEssDistance;
  task.legDistances = distances.legDistances;
  task.shortestRoute = distances.shortestRoute;

  // Build IGC path map
  const igcDir = path.join(FIXTURES, "igcs", taskName);
  const igcMap = buildIgcMap(igcDir);

  // Filter participants assigned to this task
  const taskId = TASK_ID_MAP[taskName];
  const taskParticipants = participants.filter((p) =>
    p.taskIds.includes(taskId)
  );

  // Analyze all flights
  const analyses: FlightAnalysis[] = [];
  for (const participant of taskParticipants) {
    const igcPath = igcMap.get(participant.id);
    if (!igcPath) continue;

    const analysis = await analyzeFlightForTask(igcPath, task, participant.id, {
      minDistance: formula.minimumDistance,
      radiusTolerance: formula.turnpointRadiusTolerance,
      minAbsTolerance: formula.turnpointRadiusMinimumAbsoluteTolerance,
      scoringAltitude: formula.scoringAltitude === "GPS" ? "GPS" : "QNH",
      useLegacyLandingDetection: formula.useLegacyLandingDetection,
    });
    analyses.push(analysis);
  }

  const result = await scoreTask({ task, analyses, formula });

  return { result, expected };
}

describe("Task Scoring Integration", () => {
  describe.each(["task10", "task11", "task12"])("%s", (taskName) => {
    let result: TaskResult;
    let expected: ExpectedTaskResult;

    beforeAll(async () => {
      const scored = await analyzeAndScoreTask(taskName);
      result = scored.result;
      expected = scored.expected;
    }, 300000);

    it("should produce correct day quality", () => {
      expect(result.dayQuality).toBeCloseTo(expected.dayQuality, 1);
    });

    it("should produce correct available points", () => {
      expect(result.availablePoints.totalAvailable).toBeCloseTo(
        expected.availablePoints.totalAvailable,
        0
      );
      expect(
        Math.abs(
          result.availablePoints.distanceAvailable -
            expected.availablePoints.distanceAvailable
        )
      ).toBeLessThan(1);
      expect(
        Math.abs(
          result.availablePoints.timeAvailable -
            expected.availablePoints.timeAvailable
        )
      ).toBeLessThan(1);
      expect(
        Math.abs(
          result.availablePoints.leadingAvailable -
            expected.availablePoints.leadingAvailable
        )
      ).toBeLessThan(1);
    });

    it("should produce correct pilot count", () => {
      expect(result.pilotResults.length).toBe(expected.pilotResults.length);
    });

    it("should produce correct pilots in goal / reaching ESS", () => {
      expect(result.statistics.pilotsInGoal).toBe(
        expected.statistics.pilotsInGoal
      );
      expect(result.statistics.pilotsReachedESS).toBe(
        expected.statistics.pilotsReachedESS
      );
    });

    it("should produce correct task distance (within 5m of FS)", () => {
      if (expected.fsStats?.taskDistanceKm) {
        const fsTaskDistance = expected.fsStats.taskDistanceKm * 1000;
        expect(
          Math.abs(result.statistics.bestDistance - fsTaskDistance)
        ).toBeLessThan(5);
      }
    });

    it("should produce correct total points for each pilot", () => {
      const expectedByPilot = new Map(
        expected.pilotResults.map((p: PilotResult) => [p.pilotId, p])
      );

      for (const pilotResult of result.pilotResults) {
        const exp = expectedByPilot.get(pilotResult.pilotId);
        if (!exp) continue;
        expect(
          Math.abs(pilotResult.totalPoints - exp.totalPoints)
        ).toBeLessThan(1);
      }
    });

    it("should produce correct component points for each pilot", () => {
      const expectedByPilot = new Map(
        expected.pilotResults.map((p: PilotResult) => [p.pilotId, p])
      );

      for (const pilotResult of result.pilotResults) {
        const exp = expectedByPilot.get(pilotResult.pilotId);
        if (!exp) continue;

        expect(
          Math.abs(pilotResult.distancePoints - exp.distancePoints)
        ).toBeLessThan(1);
        expect(Math.abs(pilotResult.timePoints - exp.timePoints)).toBeLessThan(
          1
        );
        expect(
          Math.abs(pilotResult.leadingPoints - exp.leadingPoints)
        ).toBeLessThan(1);
      }
    });

    it("should produce correct rankings", () => {
      const expectedByPilot = new Map(
        expected.pilotResults.map((p: PilotResult) => [p.pilotId, p])
      );

      for (const pilotResult of result.pilotResults) {
        const exp = expectedByPilot.get(pilotResult.pilotId);
        if (!exp) continue;
        expect(Math.abs(pilotResult.rank - exp.rank)).toBeLessThanOrEqual(1);
      }
    });
  });
});
