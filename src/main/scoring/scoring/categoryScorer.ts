/**
 * Category scorer.
 *
 * Produces per-category task results and competition standings by filtering
 * and re-ranking from parent results. Matches FS behavior from
 * GAP.CreateTaskResults() (GAP.cs:1670-1731).
 */

import type {
  CompetitionCategory,
  Participant,
  PilotResult,
  TaskResult,
} from "../types";
import { getMatchingPilotIds } from "./categoryMatcher";

/**
 * Topologically sort categories so parents are processed before children.
 * Matches FS TopologicalCategorySorter (TopologicalCategorySorter.cs).
 */
export function sortCategoriesByDependency(
  categories: CompetitionCategory[]
): CompetitionCategory[] {
  const byName = new Map<string, CompetitionCategory>();
  for (const cat of categories) {
    byName.set(cat.name, cat);
  }

  const visited = new Set<string>();
  const sorted: CompetitionCategory[] = [];

  for (const cat of categories) {
    if (visited.has(cat.name)) continue;

    const stack: string[] = [cat.name];
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const currentCat = byName.get(current);

      let allDepsProcessed = true;

      if (currentCat) {
        const dep = currentCat.filterFromCategory;
        if (dep && dep !== "" && byName.has(dep) && !visited.has(dep)) {
          stack.push(dep);
          allDepsProcessed = false;
        }
      }

      if (allDepsProcessed) {
        stack.pop();
        if (!visited.has(current) && byName.has(current)) {
          visited.add(current);
          sorted.push(byName.get(current)!);
        }
      }
    }
  }

  return sorted;
}

/**
 * Re-rank pilot results: assign sequential ranks based on totalPoints descending.
 * Equal points get equal rank.
 */
function assignRanks(pilotResults: PilotResult[]): PilotResult[] {
  const sorted = [...pilotResults].sort(
    (a, b) => b.totalPoints - a.totalPoints
  );

  let currentRank = 0;
  let prevPoints = -1;

  return sorted.map((result, index) => {
    if (result.totalPoints !== prevPoints) {
      currentRank = index + 1;
      prevPoints = result.totalPoints;
    }
    return { ...result, rank: currentRank };
  });
}

/**
 * Create a category task result by filtering and re-ranking from a parent result.
 * This is the "filter mode" — points are preserved from the parent, only ranks change.
 */
export function filterTaskResult(
  parentResult: TaskResult,
  category: CompetitionCategory,
  participants: Participant[]
): TaskResult {
  const matchingIds = getMatchingPilotIds(participants, category.selectors);

  const filteredResults = parentResult.pilotResults.filter((pr) =>
    matchingIds.has(pr.pilotId)
  );

  const rankedResults = assignRanks(filteredResults);

  return {
    ...parentResult,
    categoryName: category.name,
    pilotResults: rankedResults,
  };
}

/**
 * Score all categories for a task, producing a map of categoryId -> TaskResult.
 * Categories are processed in topological order so parent results are available.
 */
export function scoreAllCategoriesForTask(
  overallResult: TaskResult,
  categories: CompetitionCategory[],
  participants: Participant[]
): Map<string, TaskResult> {
  const results = new Map<string, TaskResult>();
  const resultsByName = new Map<string, TaskResult>();

  // Overall is always available as base
  resultsByName.set("", overallResult);
  resultsByName.set("Overall", overallResult);

  const sorted = sortCategoriesByDependency(categories);

  for (const category of sorted) {
    const parentName = category.filterFromCategory || "Overall";
    const parentResult = resultsByName.get(parentName) ?? overallResult;

    const categoryResult = filterTaskResult(
      parentResult,
      category,
      participants
    );

    results.set(category.id, categoryResult);
    resultsByName.set(category.name, categoryResult);
  }

  return results;
}
