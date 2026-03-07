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

        for (const [taskUuid, score] of Object.entries(standing.taskScores)) {
          const fsdbTaskId = UUID_TO_FSDB[taskUuid];
          if (!fsdbTaskId || !exp.taskPoints[fsdbTaskId]) continue;

          const expectedCounting = exp.taskPoints[fsdbTaskId].countingPoints;
          expect(
            Math.abs(score.countingPoints - expectedCounting),
            `Pilot ${standing.participantId} task ${fsdbTaskId}: got ${score.countingPoints}, expected ${expectedCounting}`
          ).toBeLessThanOrEqual(0.2);
        }
      }
    });

    it("should preserve original points matching raw task scores", () => {
      const expectedByPilot = new Map(
        expectedFixture.standings.map((s) => [s.pilotId, s])
      );

      for (const standing of standings) {
        const exp = expectedByPilot.get(standing.participantId);
        if (!exp) continue;

        for (const [taskUuid, score] of Object.entries(standing.taskScores)) {
          const fsdbTaskId = UUID_TO_FSDB[taskUuid];
          if (!fsdbTaskId || !exp.taskPoints[fsdbTaskId]) continue;

          const expectedOriginal = exp.taskPoints[fsdbTaskId].points;
          expect(
            Math.abs(score.originalPoints - expectedOriginal),
            `Pilot ${standing.participantId} task ${fsdbTaskId}: originalPoints ${score.originalPoints}, expected ${expectedOriginal}`
          ).toBeLessThanOrEqual(0.2);
        }
      }
    });

    it("should detect partial counting correctly", () => {
      const expectedByPilot = new Map(
        expectedFixture.standings.map((s) => [s.pilotId, s])
      );

      for (const standing of standings) {
        const exp = expectedByPilot.get(standing.participantId);
        if (!exp) continue;

        for (const [taskUuid, score] of Object.entries(standing.taskScores)) {
          const fsdbTaskId = UUID_TO_FSDB[taskUuid];
          if (!fsdbTaskId || !exp.taskPoints[fsdbTaskId]) continue;

          const expTask = exp.taskPoints[fsdbTaskId];
          const expectedPartial =
            expTask.points !== expTask.countingPoints && expTask.points > 0;
          const actualPartial =
            score.originalPoints !== score.countingPoints &&
            score.originalPoints > 0;

          expect(
            actualPartial,
            `Pilot ${standing.participantId} task ${fsdbTaskId}: partial=${actualPartial}, expected=${expectedPartial}`
          ).toBe(expectedPartial);
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

    it("should mark all tasks as fully counting when no FTV", () => {
      const taskResults: TaskResult[] = ["task10", "task11", "task12"].map(
        (name) => loadFixture<TaskResult>(`expected-results/${name}.json`)
      );

      const formula = loadFixture<ScoringFormulaConfig>("formula.json");
      formula.ftvFactor = 0;

      const result = calculateCompetitionStandings(taskResults, [], formula);

      for (const standing of result.standings) {
        for (const score of Object.values(standing.taskScores)) {
          expect(score.counting).toBe(true);
          expect(score.originalPoints).toBe(score.countingPoints);
        }
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

  describe("FS HTML comparison", () => {
    interface FsHtmlPilot {
      rank: number;
      id: number;
      name: string;
      total: number;
      taskScores: { countingPoints: number; originalPoints: number | null }[];
    }

    function parseFsHtml(): FsHtmlPilot[] {
      const htmlPath = path.resolve(
        __dirname,
        "../../docs/test-data/lliga-catalana/PROVA_Overall_V338_compe.html"
      );
      const html = fs.readFileSync(htmlPath, "utf-8");

      const pilots: FsHtmlPilot[] = [];

      // Match data rows (after thead). Each pilot row has: rank, id, name, M/F, nation, glider, category, T1, T2, T3, Total
      const rowRe = /<tr class="fs_res_res_row"[^>]*>\s*([\s\S]*?)<\/tr>/g;
      // Skip header rows (contain <th>)
      let match;
      while ((match = rowRe.exec(html)) !== null) {
        const rowContent = match[1];
        if (rowContent.includes("<th")) continue;

        const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
        const cells: string[] = [];
        let cellMatch;
        while ((cellMatch = cellRe.exec(rowContent)) !== null) {
          cells.push(cellMatch[1].trim());
        }

        if (cells.length < 11) continue;

        const rank = parseInt(cells[0], 10);
        const id = parseInt(cells[1], 10);
        const name = cells[2];

        // Parse task score cells (indices 7, 8, 9)
        const taskScores: {
          countingPoints: number;
          originalPoints: number | null;
        }[] = [];
        for (let i = 7; i <= 9; i++) {
          const cell = cells[i];
          const delMatch = cell.match(/([\d.]+)\s*\/\s*<del>([\d.]+)<\/del>/);
          if (delMatch) {
            taskScores.push({
              countingPoints: parseFloat(delMatch[1]),
              originalPoints: parseFloat(delMatch[2]),
            });
          } else {
            const pts = parseFloat(cell);
            taskScores.push({
              countingPoints: isNaN(pts) ? 0 : pts,
              originalPoints: null,
            });
          }
        }

        // Total is last cell, strip bold tags
        const totalStr = cells[cells.length - 1].replace(/<[^>]*>/g, "").trim();
        const total = parseInt(totalStr, 10);

        pilots.push({ rank, id, name, total, taskScores });
      }

      return pilots;
    }

    let standings: ReturnType<
      typeof calculateCompetitionStandings
    >["standings"];
    let fsPilots: FsHtmlPilot[];

    // Task order in FS HTML (verified by matching scores):
    // T1=PROVA3=task12, T2=PROVA SERGI=task10, T3=PROVA SERGI2=task11
    const FS_TASK_ORDER = [
      TASK_ID_MAP.task12,
      TASK_ID_MAP.task10,
      TASK_ID_MAP.task11,
    ];

    beforeAll(() => {
      fsPilots = parseFsHtml();

      const taskResults: TaskResult[] = ["task10", "task11", "task12"].map(
        (name) => loadFixture<TaskResult>(`expected-results/${name}.json`)
      );

      const formula = loadFixture<ScoringFormulaConfig>("formula.json");
      formula.ftvFactor = 0.33;
      formula.useBestScoreForFtvValidity = true;

      const result = calculateCompetitionStandings(taskResults, [], formula);
      standings = result.standings;
    });

    it("should parse FS HTML correctly", () => {
      expect(fsPilots.length).toBeGreaterThan(0);
      // First pilot should be rank 1
      expect(fsPilots[0].rank).toBe(1);
    });

    it("should match all pilot rankings", () => {
      const standingByPilot = new Map(
        standings.map((s) => [s.participantId, s])
      );

      for (const fsPilot of fsPilots) {
        const standing = standingByPilot.get(fsPilot.id);
        expect(
          standing,
          `Pilot ${fsPilot.id} (${fsPilot.name}) not found in standings`
        ).toBeDefined();
        if (!standing) continue;

        expect(
          standing.rank,
          `Pilot ${fsPilot.id} rank: got ${standing.rank}, expected ${fsPilot.rank}`
        ).toBe(fsPilot.rank);
      }
    });

    it("should match all pilot totals (±1)", () => {
      const standingByPilot = new Map(
        standings.map((s) => [s.participantId, s])
      );

      for (const fsPilot of fsPilots) {
        const standing = standingByPilot.get(fsPilot.id);
        if (!standing) continue;

        expect(
          Math.abs(standing.totalPoints - fsPilot.total),
          `Pilot ${fsPilot.id} total: got ${standing.totalPoints}, expected ${fsPilot.total}`
        ).toBeLessThanOrEqual(1);
      }
    });

    it("should match task counting points (±0.2)", () => {
      const standingByPilot = new Map(
        standings.map((s) => [s.participantId, s])
      );

      for (const fsPilot of fsPilots) {
        const standing = standingByPilot.get(fsPilot.id);
        if (!standing) continue;

        for (let i = 0; i < FS_TASK_ORDER.length; i++) {
          const taskId = FS_TASK_ORDER[i];
          const fsScore = fsPilot.taskScores[i];
          const score = standing.taskScores[taskId];

          if (!score) continue;

          expect(
            Math.abs(score.countingPoints - fsScore.countingPoints),
            `Pilot ${fsPilot.id} T${i + 1}: counting ${score.countingPoints}, expected ${fsScore.countingPoints}`
          ).toBeLessThanOrEqual(0.2);
        }
      }
    });

    it("should match strikethrough/partial detection", () => {
      const standingByPilot = new Map(
        standings.map((s) => [s.participantId, s])
      );

      for (const fsPilot of fsPilots) {
        const standing = standingByPilot.get(fsPilot.id);
        if (!standing) continue;

        for (let i = 0; i < FS_TASK_ORDER.length; i++) {
          const taskId = FS_TASK_ORDER[i];
          const fsScore = fsPilot.taskScores[i];
          const score = standing.taskScores[taskId];

          if (!score) continue;

          const fsIsPartial = fsScore.originalPoints !== null;
          const ourIsPartial =
            score.originalPoints !== score.countingPoints &&
            score.originalPoints > 0;

          expect(
            ourIsPartial,
            `Pilot ${fsPilot.id} T${i + 1}: partial=${ourIsPartial}, FS has del=${fsIsPartial}`
          ).toBe(fsIsPartial);
        }
      }
    });
  });
});
