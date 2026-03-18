/**
 * Category participant matcher.
 *
 * Resolves category selectors against participant attributes to determine
 * which pilots belong to a category. Matches FS behavior from
 * Fsdb.Filter_Participants_By_Attribute() (Fsdb.public.misc.cs:178-215).
 */

import type {
  CategorySelector,
  Participant,
  SelectorComparator,
} from "../types";

/**
 * Resolves an attribute name to the participant's value for that attribute.
 *
 * Standard attributes map to named Participant fields:
 *   "female"       → "1" if genre=FEMALE, "0" otherwise
 *   "nat_code_ioc" → nation
 *   "glider_class" → gliderClass
 *   "club"         → club
 *   "glider"       → glider
 *   "fai_licence"  → faiId (truthy = "1", empty = "0")
 *
 * Custom attributes (prefixed "ca:") look up customAttributes map.
 */
function resolveAttribute(
  participant: Participant,
  attributeName: string
): string {
  if (attributeName.startsWith("ca:")) {
    const key = attributeName.substring(3);
    return participant.customAttributes?.[key] ?? "";
  }

  switch (attributeName) {
    case "female":
      return participant.genre === "FEMALE" ? "1" : "0";
    case "nat_code_ioc":
      return participant.nation ?? "";
    case "glider_class":
      return participant.gliderClass ?? "";
    case "club":
      return participant.club ?? "";
    case "glider":
      return participant.glider ?? "";
    case "fai_licence":
      return participant.faiId ? "1" : "0";
    default:
      return "";
  }
}

/**
 * Tests whether a value matches a selector using the given comparator.
 * All comparisons are case-insensitive, matching FS behavior.
 */
function matchesComparator(
  value: string,
  comparator: SelectorComparator,
  requiredValue: string
): boolean {
  const lowerValue = value.toLowerCase();
  const lowerRequired = requiredValue.toLowerCase();

  switch (comparator) {
    case "equals":
      return lowerValue === lowerRequired;
    case "begins_with":
      return lowerValue.startsWith(lowerRequired);
    case "contains":
      return lowerValue.includes(lowerRequired);
  }
}

/**
 * Tests whether a participant matches ALL selectors (AND logic).
 */
export function matchesCategory(
  participant: Participant,
  selectors: CategorySelector[]
): boolean {
  if (selectors.length === 0) return true;

  return selectors.every((selector) => {
    const value = resolveAttribute(participant, selector.attributeName);
    return matchesComparator(
      value,
      selector.comparator,
      selector.requiredValue
    );
  });
}

/**
 * Returns the set of participant IDs that match all selectors.
 */
export function getMatchingPilotIds(
  participants: Participant[],
  selectors: CategorySelector[]
): Set<number> {
  const ids = new Set<number>();
  for (const p of participants) {
    if (matchesCategory(p, selectors)) {
      ids.add(p.id);
    }
  }
  return ids;
}
