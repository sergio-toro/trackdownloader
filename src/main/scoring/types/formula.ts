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
  dayQualityOverride: number; // 0 = no override, >0 overrides computed day quality (0-1)
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

  // Landing detection
  useLegacyLandingDetection: boolean; // true = 4-min avg speed, false = 60s window (default)
}

/**
 * GAP2023 defaults for Paragliding
 */
export const GAP2023_PG_DEFAULTS: ScoringFormulaConfig = {
  name: "GAP2023",

  // Nominal values
  nominalDistance: 70000, // 70 km
  nominalTime: 5400, // 90 minutes (1.5 hours)
  nominalGoal: 0.3, // 30%
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
  leadingFraction: 0.162, // Constant leading weight for GAP2023 PG
  arrivalFraction: 0,
  departureFraction: 0,

  // Leading calculator settings
  leadingCalculatorType: "PWC2019",
  leadingWeightFactor: 1.0,
  useConstantLeadingWeight: true, // GAP2023 PG uses fixed 0.162 leading weight
  useProportionalLeadingWeightIfNobodyInGoal: false,
  useLeadingTimeRatio: false, // GAP2023 does NOT use leading time ratio

  // Time points settings
  useFlatDecline: true, // 5/6 exponent
  timePointsIfNotInGoal: 0,
  redistributeRemovedTimePointsAsDistancePoints: true,

  // Distance points settings
  useDifficultyForDistancePoints: false, // PG does NOT use difficulty

  // Final glide decelerator
  finalGlideDecelerator: "none",
  cessIncline: 3.5,
  aatbFactor: 0.45,

  // Goal settings
  useSemiCircleControlZoneForGoalLine: true,
  scoringAltitude: "QNH", // GAP2023 uses QNH

  // Stopped task settings
  scoreBackTime: 300, // 5 minutes
  minTimeSpanForValidTask: 0, // PG: no minimum
  altitudeBonusFactor: 0,
  minimumValidityToCountStoppedTask: 0.05, // PG: 5%

  // Turnpoint tolerance
  turnpointRadiusTolerance: 0.002, // 0.2% (non-FAI default)
  turnpointRadiusMinimumAbsoluteTolerance: 5, // 5 meters

  // FTV
  ftvFactor: 0, // No FTV
  useBestScoreForFtvValidity: true,

  // Day quality settings
  dayQualityOverride: 0, // 0 = no override
  use1000PointsForMaxDayQuality: false,
  normalize1000BeforeDayQuality: false,

  // Jump the gun
  jumpTheGunFactor: 0, // PG: no jump the gun
  jumpTheGunMax: 0, // PG: no jump the gun

  // Decimal precision
  numberOfDecimalsTaskResults: 1,
  numberOfDecimalsCompetitionResults: 0,

  // Misc
  isPgComp: true,
  faiSanctioning: 0,
  bonusGr: 4, // PG GAP2023: glide ratio 4
  bonusForWholeTrack: true,
  optimizeSsAlone: false,
  useFirstPilotStartTimeForLC: false,

  // Landing detection
  useLegacyLandingDetection: false,
};

/**
 * GAP2025 defaults for Paragliding
 * Based on GAP2023 with updates
 */
export const GAP2025_PG_DEFAULTS: ScoringFormulaConfig = {
  ...GAP2023_PG_DEFAULTS,
  name: "GAP2025",

  // GAP2025 uses dynamic leading weight via time ratio (not constant)
  useConstantLeadingWeight: false,
  useLeadingTimeRatio: true,
  leadingFraction: 0.26,

  // GAP2025 uses PWC2019 leading calculator (via GAP2025Legacy override in FS)
  leadingCalculatorType: "PWC2019",

  // GAP2025 switched to GPS altitude
  scoringAltitude: "GPS",
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
