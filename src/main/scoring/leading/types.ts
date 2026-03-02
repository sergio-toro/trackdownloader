/**
 * Leading coefficient calculation types
 */

/**
 * Result from leading coefficient calculation
 */
export interface LeadingCalculatorResult {
  /** Final leading coefficient value */
  leadingCoeff: number;

  /** Area accumulated before reaching best position */
  areaBeforeBest: number;

  /** Area accumulated after best position (backtracking penalty) */
  areaAfterBest: number;

  /** Total area under the time-distance curve */
  totalArea: number;
}

/**
 * Options for leading coefficient calculation
 */
export interface LeadingCalculatorOptions {
  /** Speed section distance in meters */
  speedSectionDistance: number;

  /** ESS altitude in meters (for altitude bonus) */
  essAltitude?: number;

  /** Altitude bonus factor (0 = none, 0.05 = 5% per 1000m) */
  altitudeBonusFactor?: number;
}
