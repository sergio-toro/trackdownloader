import { describe, it, expect } from "vitest";
import {
  matchesCategory,
  getMatchingPilotIds,
} from "../../src/main/scoring/scoring/categoryMatcher";
import type {
  CategorySelector,
  Participant,
} from "../../src/main/scoring/types";

function makeParticipant(
  overrides: Partial<Participant> & { id: number }
): Participant {
  return {
    name: "Test Pilot",
    status: "Confirmed",
    ...overrides,
  };
}

describe("categoryMatcher", () => {
  describe("matchesCategory", () => {
    it("should match female attribute", () => {
      const pilot = makeParticipant({ id: 1, genre: "FEMALE" });
      const selectors: CategorySelector[] = [
        { attributeName: "female", comparator: "equals", requiredValue: "1" },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should not match male for female selector", () => {
      const pilot = makeParticipant({ id: 1, genre: "MALE" });
      const selectors: CategorySelector[] = [
        { attributeName: "female", comparator: "equals", requiredValue: "1" },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(false);
    });

    it("should match undefined genre as not female", () => {
      const pilot = makeParticipant({ id: 1 });
      const selectors: CategorySelector[] = [
        { attributeName: "female", comparator: "equals", requiredValue: "0" },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should match nation code", () => {
      const pilot = makeParticipant({ id: 1, nation: "ESP" });
      const selectors: CategorySelector[] = [
        {
          attributeName: "nat_code_ioc",
          comparator: "equals",
          requiredValue: "ESP",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should match nation code case-insensitively", () => {
      const pilot = makeParticipant({ id: 1, nation: "ESP" });
      const selectors: CategorySelector[] = [
        {
          attributeName: "nat_code_ioc",
          comparator: "equals",
          requiredValue: "esp",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should match glider_class", () => {
      const pilot = makeParticipant({ id: 1, gliderClass: "Serial" });
      const selectors: CategorySelector[] = [
        {
          attributeName: "glider_class",
          comparator: "equals",
          requiredValue: "Serial",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should match club", () => {
      const pilot = makeParticipant({ id: 1, club: "Aeroclub Barcelona" });
      const selectors: CategorySelector[] = [
        {
          attributeName: "club",
          comparator: "equals",
          requiredValue: "Aeroclub Barcelona",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should match custom attribute", () => {
      const pilot = makeParticipant({
        id: 1,
        customAttributes: { wing_class: "Sport" },
      });
      const selectors: CategorySelector[] = [
        {
          attributeName: "ca:wing_class",
          comparator: "equals",
          requiredValue: "Sport",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should return false for missing custom attribute", () => {
      const pilot = makeParticipant({ id: 1 });
      const selectors: CategorySelector[] = [
        {
          attributeName: "ca:wing_class",
          comparator: "equals",
          requiredValue: "Sport",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(false);
    });

    it("should support begins_with comparator", () => {
      const pilot = makeParticipant({ id: 1, gliderClass: "Serial Class" });
      const selectors: CategorySelector[] = [
        {
          attributeName: "glider_class",
          comparator: "begins_with",
          requiredValue: "Serial",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should support contains comparator", () => {
      const pilot = makeParticipant({
        id: 1,
        glider: "Ozone Enzo 3 Serial",
      });
      const selectors: CategorySelector[] = [
        {
          attributeName: "glider",
          comparator: "contains",
          requiredValue: "Enzo",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should AND multiple selectors", () => {
      const pilot = makeParticipant({
        id: 1,
        genre: "FEMALE",
        gliderClass: "Serial",
      });
      const selectors: CategorySelector[] = [
        { attributeName: "female", comparator: "equals", requiredValue: "1" },
        {
          attributeName: "glider_class",
          comparator: "equals",
          requiredValue: "Serial",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should fail if any selector doesn't match (AND logic)", () => {
      const pilot = makeParticipant({
        id: 1,
        genre: "MALE",
        gliderClass: "Serial",
      });
      const selectors: CategorySelector[] = [
        { attributeName: "female", comparator: "equals", requiredValue: "1" },
        {
          attributeName: "glider_class",
          comparator: "equals",
          requiredValue: "Serial",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(false);
    });

    it("should match all pilots with empty selectors", () => {
      const pilot = makeParticipant({ id: 1 });
      expect(matchesCategory(pilot, [])).toBe(true);
    });

    it("should match fai_licence", () => {
      const pilot = makeParticipant({ id: 1, faiId: "12345" });
      const selectors: CategorySelector[] = [
        {
          attributeName: "fai_licence",
          comparator: "equals",
          requiredValue: "1",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(true);
    });

    it("should not match fai_licence when empty", () => {
      const pilot = makeParticipant({ id: 1, faiId: "" });
      const selectors: CategorySelector[] = [
        {
          attributeName: "fai_licence",
          comparator: "equals",
          requiredValue: "1",
        },
      ];
      expect(matchesCategory(pilot, selectors)).toBe(false);
    });
  });

  describe("getMatchingPilotIds", () => {
    it("should return matching pilot IDs", () => {
      const pilots = [
        makeParticipant({ id: 1, genre: "FEMALE" }),
        makeParticipant({ id: 2, genre: "MALE" }),
        makeParticipant({ id: 3, genre: "FEMALE" }),
        makeParticipant({ id: 4 }),
      ];
      const selectors: CategorySelector[] = [
        { attributeName: "female", comparator: "equals", requiredValue: "1" },
      ];
      const ids = getMatchingPilotIds(pilots, selectors);
      expect(ids).toEqual(new Set([1, 3]));
    });

    it("should return all IDs with empty selectors", () => {
      const pilots = [makeParticipant({ id: 1 }), makeParticipant({ id: 2 })];
      const ids = getMatchingPilotIds(pilots, []);
      expect(ids).toEqual(new Set([1, 2]));
    });
  });
});
