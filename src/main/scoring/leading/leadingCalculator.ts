/**
 * Leading Coefficient Calculator Dispatcher
 *
 * Dispatches to the appropriate LC calculator based on formula configuration.
 */

import type { TimeDist } from "../types/flightAnalysis";
import type { ScoringFormulaConfig } from "../types/formula";
import type {
  LeadingCalculatorResult,
  LeadingCalculatorOptions,
} from "./types";
import { calculateClassicLC } from "./classicCalculator";
import { calculatePwc2019LC } from "./pwc2019Calculator";
import { calculatePwc2023LC } from "./pwc2023Calculator";

/**
 * Calculate leading coefficient using the configured calculator type
 *
 * @param graph Time-distance graph from flight analysis
 * @param formula Scoring formula configuration
 * @param speedSectionDistance Speed section distance in meters
 * @param essAltitude ESS altitude in meters (optional)
 * @returns Leading coefficient result
 */
export function calculateLeadingCoeff(
  graph: TimeDist[],
  formula: ScoringFormulaConfig,
  speedSectionDistance: number,
  essAltitude?: number
): LeadingCalculatorResult {
  const options: LeadingCalculatorOptions = {
    speedSectionDistance,
    essAltitude,
    altitudeBonusFactor: formula.altitudeBonusFactor,
  };

  switch (formula.leadingCalculatorType) {
    case "PWC2023":
      return calculatePwc2023LC(graph, options);

    case "PWC2019":
      return calculatePwc2019LC(graph, options);

    case "Classic":
    default:
      return calculateClassicLC(graph, options);
  }
}

/**
 * Calculate task LC minimum for normalization
 *
 * The task LC minimum is used to normalize leading coefficients
 * so that the best LC gets full leading points.
 *
 * @param allGraphs Time-distance graphs from all pilot analyses
 * @param formula Scoring formula configuration
 * @param speedSectionDistance Speed section distance in meters
 * @param essAltitude ESS altitude in meters (optional)
 * @returns Minimum LC value (or 1 if no valid LCs)
 */
export function calculateTaskLcMin(
  allGraphs: TimeDist[][],
  formula: ScoringFormulaConfig,
  speedSectionDistance: number,
  essAltitude?: number
): number {
  const lcValues = allGraphs
    .filter((graph) => graph && graph.length >= 2)
    .map((graph) => {
      const result = calculateLeadingCoeff(
        graph,
        formula,
        speedSectionDistance,
        essAltitude
      );
      return result.totalArea;
    })
    .filter((lc) => lc > 0);

  return lcValues.length > 0 ? Math.min(...lcValues) : 1;
}
