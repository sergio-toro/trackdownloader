/**
 * Scoring formula configuration types and defaults
 */

import type { LeadingCalculatorType } from "./competition";

/**
 * Formula identifier
 */
export type FormulaId = "GAP2023" | "GAP2025";

/**
 * Complete scoring formula configuration
 */
export interface ScoringFormulaConfig {
  name: FormulaId;

  // Nominal values
  nominalDistance: number; // meters (default: 50000)
  nominalTime: number; // seconds (default: 5400 = 90 min)
  nominalGoal: number; // 0-1 (default: 0.2)
  nominalLaunch: number; // 0-1 (default: 0.96)

  // Minimum distance
  minimumDistance: number; // meters (default: 7000)

  // Point category toggles
  useDistancePoints: boolean;
  useTimePoints: boolean;
  useLeadingPoints: boolean;
  useArrivalPoints: boolean;
  useDeparturePoints: boolean;

  // Point fractions
  leadingFraction: number; // 0-1 (default: 0.26 for leading time ratio)
  arrivalFraction: number; // 0-1 (default: 0)
  departureFraction: number; // 0-1 (default: 0)

  // Leading calculator settings
  leadingCalculatorType: LeadingCalculatorType;
  leadingWeightFactor: number; // 0-2 (default: 1.0)
  useConstantLeadingWeight: boolean;
  useProportionalLeadingWeightIfNobodyInGoal: boolean;
  useLeadingTimeRatio: boolean;

  // Time points settings
  useFlatDecline: boolean; // true = 5/6 exponent, false = 2/3
  timePointsIfNotInGoal: number; // fraction 0-1 (default: 0)
  redistributeRemovedTimePointsAsDistancePoints: boolean;

  // Distance points settings
  useDifficultyForDistancePoints: boolean;

  // Final glide decelerator
  finalGlideDecelerator: "none" | "cess" | "aatb";
  cessIncline: number; // degrees (default: 0)
  aatbFactor: number; // 0-1 (default: 0)

  // Goal settings
  useSemiCircleControlZoneForGoalLine: boolean;
  scoringAltitude: "GPS" | "QNH" | "TA";

  // Stopped task settings
  scoreBackTime: number; // seconds (default: 300 = 5 min)
  minTimeSpanForValidTask: number; // seconds (default: 3600 = 1 hr)
  altitudeBonusFactor: number; // 0-0.1 (default: 0)
  minimumValidityToCountStoppedTask: number; // 0-1

  // Turnpoint tolerance
  turnpointRadiusTolerance: number; // fraction 0-1
  turnpointRadiusMinimumAbsoluteTolerance: number; // meters

  // FTV (Fixed Total Validity)
  ftvFactor: number; // 0-1 (default: 0 = no FTV)
  useBestScoreForFtvValidity: boolean;

  // Day quality settings
  use1000PointsForMaxDayQuality: boolean;
  normalize1000BeforeDayQuality: boolean;

  // Jump the gun
  jumpTheGunFactor: number; // points per second early
  jumpTheGunMax: number; // max penalty in points

  // Decimal precision
  numberOfDecimalsTaskResults: number;
  numberOfDecimalsCompetitionResults: number;

  // Misc
  isPgComp: boolean; // paragliding (true) vs hang gliding
  faiSanctioning: number; // 0 = none, 1 = cat 2, 2 = cat 1
  bonusGr: number; // glide ratio for stopped task bonus
  bonusForWholeTrack: boolean;
  optimizeSsAlone: boolean;
  useFirstPilotStartTimeForLC: boolean;
}

/**
 * GAP2023 defaults for Paragliding
 */
export const GAP2023_PG_DEFAULTS: ScoringFormulaConfig = {
  name: "GAP2023",

  // Nominal values
  nominalDistance: 50000, // 50 km
  nominalTime: 5400, // 90 minutes
  nominalGoal: 0.2, // 20%
  nominalLaunch: 0.96, // 96%

  // Minimum distance
  minimumDistance: 7000, // 7 km

  // Point category toggles
  useDistancePoints: true,
  useTimePoints: true,
  useLeadingPoints: true,
  useArrivalPoints: false,
  useDeparturePoints: false,

  // Point fractions
  leadingFraction: 0.26, // Leading time ratio
  arrivalFraction: 0,
  departureFraction: 0,

  // Leading calculator settings
  leadingCalculatorType: "PWC2023",
  leadingWeightFactor: 1.0,
  useConstantLeadingWeight: false,
  useProportionalLeadingWeightIfNobodyInGoal: true,
  useLeadingTimeRatio: true,

  // Time points settings
  useFlatDecline: true, // 5/6 exponent
  timePointsIfNotInGoal: 0,
  redistributeRemovedTimePointsAsDistancePoints: true,

  // Distance points settings
  useDifficultyForDistancePoints: true,

  // Final glide decelerator
  finalGlideDecelerator: "none",
  cessIncline: 0,
  aatbFactor: 0,

  // Goal settings
  useSemiCircleControlZoneForGoalLine: true,
  scoringAltitude: "GPS",

  // Stopped task settings
  scoreBackTime: 300, // 5 minutes
  minTimeSpanForValidTask: 3600, // 1 hour
  altitudeBonusFactor: 0,
  minimumValidityToCountStoppedTask: 0,

  // Turnpoint tolerance
  turnpointRadiusTolerance: 0.005, // 0.5%
  turnpointRadiusMinimumAbsoluteTolerance: 5, // 5 meters

  // FTV
  ftvFactor: 0, // No FTV
  useBestScoreForFtvValidity: false,

  // Day quality settings
  use1000PointsForMaxDayQuality: true,
  normalize1000BeforeDayQuality: false,

  // Jump the gun
  jumpTheGunFactor: 1, // 1 point per second
  jumpTheGunMax: 300, // max 300 points penalty

  // Decimal precision
  numberOfDecimalsTaskResults: 1,
  numberOfDecimalsCompetitionResults: 0,

  // Misc
  isPgComp: true,
  faiSanctioning: 0,
  bonusGr: 0,
  bonusForWholeTrack: false,
  optimizeSsAlone: false,
  useFirstPilotStartTimeForLC: false,
};

/**
 * GAP2025 defaults for Paragliding
 * Based on GAP2023 with updates
 */
export const GAP2025_PG_DEFAULTS: ScoringFormulaConfig = {
  ...GAP2023_PG_DEFAULTS,
  name: "GAP2025",
  // Add GAP2025-specific changes here when defined
};

/**
 * Get default formula configuration by ID
 */
export function getDefaultFormula(id: FormulaId): ScoringFormulaConfig {
  switch (id) {
    case "GAP2023":
      return { ...GAP2023_PG_DEFAULTS };
    case "GAP2025":
      return { ...GAP2025_PG_DEFAULTS };
    default:
      return { ...GAP2023_PG_DEFAULTS };
  }
}
