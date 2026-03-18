import { describe, it, expect } from "vitest";
import {
  sortCategoriesByDependency,
  filterTaskResult,
  scoreAllCategoriesForTask,
} from "../../src/main/scoring/scoring/categoryScorer";
import type {
  CompetitionCategory,
  Participant,
  PilotResult,
  TaskResult,
} from "../../src/main/scoring/types";

function makePilotResult(
  pilotId: number,
  totalPoints: number,
  rank: number
): PilotResult {
  return {
    pilotId,
    rank,
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

function makeTaskResult(pilotResults: PilotResult[]): TaskResult {
  return {
    taskId: "task-1",
    taskName: "Task 1",
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

function makeParticipant(
  id: number,
  overrides: Partial<Participant> = {}
): Participant {
  return {
    id,
    name: `Pilot ${id}`,
    status: "Confirmed",
    ...overrides,
  };
}

describe("categoryScorer", () => {
  describe("sortCategoriesByDependency", () => {
    it("should sort independent categories in original order", () => {
      const categories: CompetitionCategory[] = [
        {
          id: "cat-1",
          name: "Serial",
          useFilter: true,
          filterFromCategory: "",
          discardFactor: null,
          selectors: [],
        },
        {
          id: "cat-2",
          name: "Women",
          useFilter: true,
          filterFromCategory: "",
          discardFactor: null,
          selectors: [],
        },
      ];
      const sorted = sortCategoriesByDependency(categories);
      expect(sorted.map((c) => c.name)).toEqual(["Serial", "Women"]);
    });

    it("should sort parent before child", () => {
      const categories: CompetitionCategory[] = [
        {
          id: "cat-1",
          name: "Serial Women",
          useFilter: true,
          filterFromCategory: "Women",
          discardFactor: null,
          selectors: [],
        },
        {
          id: "cat-2",
          name: "Women",
          useFilter: true,
          filterFromCategory: "",
          discardFactor: null,
          selectors: [],
        },
      ];
      const sorted = sortCategoriesByDependency(categories);
      expect(sorted.map((c) => c.name)).toEqual(["Women", "Serial Women"]);
    });

    it("should handle three-level chain", () => {
      const categories: CompetitionCategory[] = [
        {
          id: "cat-1",
          name: "ESP Serial Women",
          useFilter: true,
          filterFromCategory: "Serial Women",
          discardFactor: null,
          selectors: [],
        },
        {
          id: "cat-2",
          name: "Serial Women",
          useFilter: true,
          filterFromCategory: "Women",
          discardFactor: null,
          selectors: [],
        },
        {
          id: "cat-3",
          name: "Women",
          useFilter: true,
          filterFromCategory: "",
          discardFactor: null,
          selectors: [],
        },
      ];
      const sorted = sortCategoriesByDependency(categories);
      expect(sorted.map((c) => c.name)).toEqual([
        "Women",
        "Serial Women",
        "ESP Serial Women",
      ]);
    });
  });

  describe("filterTaskResult", () => {
    it("should filter and re-rank pilot results", () => {
      const pilotResults = [
        makePilotResult(1, 900, 1), // Male
        makePilotResult(2, 800, 2), // Female
        makePilotResult(3, 700, 3), // Male
        makePilotResult(4, 600, 4), // Female
        makePilotResult(5, 500, 5), // Male
      ];
      const taskResult = makeTaskResult(pilotResults);

      const participants = [
        makeParticipant(1, { genre: "MALE" }),
        makeParticipant(2, { genre: "FEMALE" }),
        makeParticipant(3, { genre: "MALE" }),
        makeParticipant(4, { genre: "FEMALE" }),
        makeParticipant(5, { genre: "MALE" }),
      ];

      const womenCategory: CompetitionCategory = {
        id: "women",
        name: "Women",
        useFilter: true,
        filterFromCategory: "Overall",
        discardFactor: null,
        selectors: [
          { attributeName: "female", comparator: "equals", requiredValue: "1" },
        ],
      };

      const result = filterTaskResult(taskResult, womenCategory, participants);

      expect(result.categoryName).toBe("Women");
      expect(result.pilotResults).toHaveLength(2);
      expect(result.pilotResults[0].pilotId).toBe(2);
      expect(result.pilotResults[0].rank).toBe(1);
      expect(result.pilotResults[0].totalPoints).toBe(800); // Points preserved
      expect(result.pilotResults[1].pilotId).toBe(4);
      expect(result.pilotResults[1].rank).toBe(2);
      expect(result.pilotResults[1].totalPoints).toBe(600);
    });

    it("should assign equal ranks for equal points", () => {
      const pilotResults = [
        makePilotResult(1, 500, 1),
        makePilotResult(2, 500, 1),
        makePilotResult(3, 400, 3),
      ];
      const taskResult = makeTaskResult(pilotResults);

      const participants = [
        makeParticipant(1, { gliderClass: "Serial" }),
        makeParticipant(2, { gliderClass: "Serial" }),
        makeParticipant(3, { gliderClass: "Serial" }),
      ];

      const category: CompetitionCategory = {
        id: "serial",
        name: "Serial",
        useFilter: true,
        filterFromCategory: "",
        discardFactor: null,
        selectors: [
          {
            attributeName: "glider_class",
            comparator: "equals",
            requiredValue: "Serial",
          },
        ],
      };

      const result = filterTaskResult(taskResult, category, participants);
      expect(result.pilotResults[0].rank).toBe(1);
      expect(result.pilotResults[1].rank).toBe(1);
      expect(result.pilotResults[2].rank).toBe(3);
    });
  });

  describe("scoreAllCategoriesForTask", () => {
    it("should score multiple categories", () => {
      const pilotResults = [
        makePilotResult(1, 900, 1),
        makePilotResult(2, 800, 2),
        makePilotResult(3, 700, 3),
        makePilotResult(4, 600, 4),
      ];
      const taskResult = makeTaskResult(pilotResults);

      const participants = [
        makeParticipant(1, { genre: "MALE", gliderClass: "Serial" }),
        makeParticipant(2, { genre: "FEMALE", gliderClass: "Serial" }),
        makeParticipant(3, { genre: "MALE", gliderClass: "Sport" }),
        makeParticipant(4, { genre: "FEMALE", gliderClass: "Sport" }),
      ];

      const categories: CompetitionCategory[] = [
        {
          id: "women",
          name: "Women",
          useFilter: true,
          filterFromCategory: "",
          discardFactor: null,
          selectors: [
            {
              attributeName: "female",
              comparator: "equals",
              requiredValue: "1",
            },
          ],
        },
        {
          id: "serial",
          name: "Serial",
          useFilter: true,
          filterFromCategory: "",
          discardFactor: null,
          selectors: [
            {
              attributeName: "glider_class",
              comparator: "equals",
              requiredValue: "Serial",
            },
          ],
        },
      ];

      const results = scoreAllCategoriesForTask(
        taskResult,
        categories,
        participants
      );

      expect(results.size).toBe(2);

      const womenResult = results.get("women")!;
      expect(womenResult.pilotResults).toHaveLength(2);
      expect(womenResult.pilotResults[0].pilotId).toBe(2);
      expect(womenResult.pilotResults[0].rank).toBe(1);

      const serialResult = results.get("serial")!;
      expect(serialResult.pilotResults).toHaveLength(2);
      expect(serialResult.pilotResults[0].pilotId).toBe(1);
      expect(serialResult.pilotResults[0].rank).toBe(1);
    });

    it("should handle chained categories (filter from parent)", () => {
      const pilotResults = [
        makePilotResult(1, 900, 1),
        makePilotResult(2, 800, 2),
        makePilotResult(3, 700, 3),
        makePilotResult(4, 600, 4),
      ];
      const taskResult = makeTaskResult(pilotResults);

      const participants = [
        makeParticipant(1, { genre: "MALE", gliderClass: "Serial" }),
        makeParticipant(2, { genre: "FEMALE", gliderClass: "Serial" }),
        makeParticipant(3, { genre: "MALE", gliderClass: "Sport" }),
        makeParticipant(4, { genre: "FEMALE", gliderClass: "Sport" }),
      ];

      const categories: CompetitionCategory[] = [
        {
          id: "serial-women",
          name: "Serial Women",
          useFilter: true,
          filterFromCategory: "Serial",
          discardFactor: null,
          selectors: [
            {
              attributeName: "female",
              comparator: "equals",
              requiredValue: "1",
            },
          ],
        },
        {
          id: "serial",
          name: "Serial",
          useFilter: true,
          filterFromCategory: "",
          discardFactor: null,
          selectors: [
            {
              attributeName: "glider_class",
              comparator: "equals",
              requiredValue: "Serial",
            },
          ],
        },
      ];

      const results = scoreAllCategoriesForTask(
        taskResult,
        categories,
        participants
      );

      // Serial Women should filter from Serial results (not Overall)
      const serialWomenResult = results.get("serial-women")!;
      expect(serialWomenResult.pilotResults).toHaveLength(1);
      expect(serialWomenResult.pilotResults[0].pilotId).toBe(2);
      expect(serialWomenResult.pilotResults[0].rank).toBe(1);
    });
  });
});
