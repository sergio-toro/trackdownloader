/**
 * Category and team classification types
 *
 * Categories create sub-rankings by filtering participants on attributes.
 * Teams group participants by a shared attribute for team scoring.
 * See docs/architecture/fs-classifications.md for FS reference.
 */

/** How a selector matches against an attribute value */
export type SelectorComparator = "equals" | "begins_with" | "contains";

/**
 * A single attribute-matching rule for filtering participants into a category.
 * Multiple selectors on a category are AND-ed (all must match).
 */
export interface CategorySelector {
  /**
   * Attribute name to match against.
   * Standard attributes: "female", "nat_code_ioc", "glider_class", "club"
   * Custom attributes: prefixed with "ca:" e.g., "ca:wing_class"
   */
  attributeName: string;
  comparator: SelectorComparator;
  requiredValue: string;
}

/**
 * A competition category (user-defined sub-classification).
 * Examples: "Women", "Serial", "Sport", "Club"
 */
export interface CompetitionCategory {
  id: string;
  name: string;
  /**
   * If true, re-rank from parent category's results (preserving points).
   * If false, score independently with recalculated validity/weights.
   */
  useFilter: boolean;
  /** Parent category name to filter from. Empty string means "Overall". */
  filterFromCategory: string;
  /** FTV discard factor override. null = use competition default. */
  discardFactor: number | null;
  /** AND-ed selectors: participant must match ALL to be included. */
  selectors: CategorySelector[];
}

/**
 * A team classification definition.
 * Groups pilots by a shared attribute value for team scoring.
 */
export interface TeamDefinition {
  id: string;
  name: string;
  /**
   * Attribute name that groups pilots into teams.
   * Standard: "nat_code_ioc", "club"
   * Custom: "ca:team_name"
   */
  attributeName: string;
  /** Best N pilots counted per task (default 3). */
  numberToCount: number;
  /** Start counting from rank N, 1-based (default 1). */
  firstToCount: number;
}
