# Phase 4: Scoring Engine

This phase implements GAP2023 and GAP2025 scoring formulas.

## Goals

1. Port validity calculations (Time, Launch, Distance, Stop)
2. Port weight distribution formulas
3. Port point calculations (Distance, Time, Arrival, Leading)
4. Implement leading coefficient calculators
5. Create task scoring orchestrator

## Dependencies

- Phase 1 (Types, Storage)
- Phase 3 (Flight Analysis)

## Files to Create

```
src/main/scoring/
├── formulas/
│   ├── index.ts              # Formula registry
│   ├── baseFormula.ts        # Abstract base
│   ├── gap2023.ts            # GAP2023 implementation
│   └── gap2025.ts            # GAP2025 implementation
├── core/
│   ├── validity.ts           # Validity calculations
│   ├── weights.ts            # Weight distribution
│   └── dayQuality.ts         # Day quality calculation
├── points/
│   ├── distancePoints.ts     # Distance scoring
│   ├── timePoints.ts         # Time scoring
│   ├── arrivalPoints.ts      # Arrival scoring
│   └── leadingPoints.ts      # Leading scoring
├── leading/
│   ├── leadingCalculator.ts  # Base calculator
│   ├── classicCalculator.ts  # Classic LC
│   ├── pwc2019Calculator.ts  # PWC 2019 LC
│   └── pwc2023Calculator.ts  # PWC 2023 LC
└── scoring/
    └── taskScorer.ts         # Main orchestrator
```

---

## Task Statistics

First, gather statistics needed for scoring:

```typescript
// src/main/scoring/core/taskStatistics.ts

import type { FlightAnalysis, TaskDefinition } from '../types';

export interface TaskStatistics {
  // Pilot counts
  pilotsPresent: number;
  pilotsFlying: number;
  pilotsLaunched: number;
  pilotsLandedBeforeDeadline: number;

  // Goal stats
  pilotsInGoal: number;
  pilotsReachedESS: number;

  // Distance stats
  bestDistance: number;
  sumOfFlownDistancesOverMin: number;
  maxDistanceOverMin: number;
  minDistance: number;

  // Time stats
  bestTime: number;           // seconds
  bestFinishTime: number;     // timestamp
  lastFinishTime: number;     // timestamp

  // Leading stats
  sumOfLeadingCoeffs: number;
  smallestLeadingCoeff: number;
  leadingWeightFactor: number;

  // Nominal values
  nominalDistance: number;    // meters
  nominalTime: number;        // seconds
  nominalGoal: number;        // 0-1
  nominalLaunch: number;      // 0-1
}

export function calculateTaskStatistics(
  task: TaskDefinition,
  analyses: FlightAnalysis[],
  formula: ScoringFormulaConfig
): TaskStatistics {
  const validFlights = analyses.filter(a => a.isValid);

  // Distance calculations
  const distances = validFlights.map(a => a.distanceFlown);
  const bestDistance = Math.max(...distances, 0);
  const minDistance = formula.minimumDistance || 7000;

  const distancesOverMin = distances.filter(d => d > minDistance);
  const sumOfFlownDistancesOverMin = distancesOverMin.reduce((a, b) => a + b, 0);
  const maxDistanceOverMin = bestDistance > minDistance ? bestDistance - minDistance : 0;

  // Goal stats
  const goalFinishers = validFlights.filter(a => a.reachedGoal);
  const essFinishers = validFlights.filter(a => a.essTime !== undefined);

  // Time calculations (only for goal finishers)
  const times = goalFinishers
    .filter(a => a.startTime && a.essTime)
    .map(a => (a.essTime! - a.startTime!) / 1000);

  const bestTime = times.length > 0 ? Math.min(...times) : 0;

  const finishTimes = goalFinishers.map(a => a.essTime!);
  const bestFinishTime = finishTimes.length > 0 ? Math.min(...finishTimes) : 0;
  const lastFinishTime = finishTimes.length > 0 ? Math.max(...finishTimes) : 0;

  // Leading coefficient stats
  const leadingCoeffs = essFinishers
    .map(a => calculateLeadingCoeff(a, formula))
    .filter(lc => lc > 0);

  const sumOfLeadingCoeffs = leadingCoeffs.reduce((a, b) => a + b, 0);
  const smallestLeadingCoeff = leadingCoeffs.length > 0 ? Math.min(...leadingCoeffs) : 0;

  return {
    pilotsPresent: analyses.length,
    pilotsFlying: validFlights.length,
    pilotsLaunched: validFlights.length,
    pilotsLandedBeforeDeadline: validFlights.length,
    pilotsInGoal: goalFinishers.length,
    pilotsReachedESS: essFinishers.length,
    bestDistance,
    sumOfFlownDistancesOverMin,
    maxDistanceOverMin,
    minDistance,
    bestTime,
    bestFinishTime,
    lastFinishTime,
    sumOfLeadingCoeffs,
    smallestLeadingCoeff,
    leadingWeightFactor: formula.leadingWeightFactor || 1.0,
    nominalDistance: formula.nominalDistance,
    nominalTime: formula.nominalTime,
    nominalGoal: formula.nominalGoal,
    nominalLaunch: formula.nominalLaunch,
  };
}
```

---

## Validity Calculations

Based on `GAP.cs` lines 187-280:

```typescript
// src/main/scoring/core/validity.ts

import type { TaskStatistics, ScoringFormulaConfig } from '../types';

/**
 * Time Validity (GAP.cs lines 187-208)
 * Measures quality of the racing based on best time/distance achieved
 */
export function calcTimeValidity(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig
): number {
  const { bestTime, nominalTime, bestDistance, nominalDistance } = stats;

  let tvRaw: number;

  if (bestTime > 0) {
    // Best time achieved - use time ratio
    tvRaw = Math.min(bestTime / nominalTime, 1);
  } else {
    // No finisher - use distance ratio
    tvRaw = Math.min(bestDistance / nominalDistance, 1);
  }

  // Polynomial transformation (empirical formula)
  const tv = -0.271 + 2.912 * tvRaw - 2.098 * Math.pow(tvRaw, 2) + 0.457 * Math.pow(tvRaw, 3);

  return Math.max(0, Math.min(1, tv));
}

/**
 * Launch Validity (GAP.cs lines 210-218)
 * Penalizes when fewer pilots launch than expected
 */
export function calcLaunchValidity(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig
): number {
  const { pilotsFlying, pilotsPresent, nominalLaunch } = stats;

  if (pilotsPresent === 0) return 0;

  const lvRaw = Math.min(1.0, pilotsFlying / (pilotsPresent * nominalLaunch));

  // Polynomial transformation
  const lv = 0.028 * lvRaw + 2.917 * Math.pow(lvRaw, 2) - 1.944 * Math.pow(lvRaw, 3);

  return Math.max(0, Math.min(1, lv));
}

/**
 * Distance Validity (GAP.cs lines 220-255)
 * Measures how spread out pilots are in terms of distance
 */
export function calcDistanceValidity(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig
): number {
  const {
    pilotsFlying,
    sumOfFlownDistancesOverMin,
    maxDistanceOverMin,
    nominalDistance,
    minDistance,
  } = stats;

  if (pilotsFlying === 0 || maxDistanceOverMin <= 0) return 0;

  // Nominal distance minus minimum
  const nomDistOverMin = Math.max(0, nominalDistance - minDistance);

  if (nomDistOverMin <= 0) return 1;

  // Average distance over minimum
  const avgDistOverMin = sumOfFlownDistancesOverMin / pilotsFlying;

  // Distance validity formula
  const dvRaw = avgDistOverMin / nomDistOverMin;

  const dv = Math.min(1, dvRaw);

  return Math.max(0, dv);
}

/**
 * Stop Validity (GAP.cs lines 257-280)
 * Only applies to stopped tasks
 */
export function calcStopValidity(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig,
  taskState: string
): number {
  if (taskState !== 'Stopped') {
    return 1.0; // No penalty for regular tasks
  }

  const { pilotsInGoal, pilotsFlying, bestDistance } = stats;
  const taskDistance = formula.taskDistance || stats.nominalDistance;

  if (pilotsFlying === 0) return 0;

  // Pilots reached goal factor
  const goalFactor = pilotsInGoal / pilotsFlying;

  // Distance factor
  const distFactor = bestDistance / taskDistance;

  // Combined stop validity
  const sv = Math.max(goalFactor, distFactor);

  return Math.max(0, Math.min(1, sv));
}

/**
 * Calculate Day Quality (GAP.cs lines 282-290)
 * Combined validity measure
 */
export function calcDayQuality(
  timeValidity: number,
  launchValidity: number,
  distanceValidity: number,
  stopValidity: number
): number {
  return timeValidity * launchValidity * distanceValidity * stopValidity;
}
```

---

## Weight Distribution

Based on `GAP.cs` lines 300-450:

```typescript
// src/main/scoring/core/weights.ts

import type { TaskStatistics, ScoringFormulaConfig } from '../types';

export interface PointWeights {
  distanceWeight: number;
  timeWeight: number;
  arrivalWeight: number;
  leadingWeight: number;
  departureWeight: number;
}

export interface AvailablePoints {
  totalAvailable: number;
  distanceAvailable: number;
  timeAvailable: number;
  arrivalAvailable: number;
  leadingAvailable: number;
  departureAvailable: number;
}

/**
 * Calculate point weight distribution (GAP.cs lines 300-380)
 */
export function calculateWeights(
  stats: TaskStatistics,
  formula: ScoringFormulaConfig,
  dayQuality: number
): PointWeights {
  const {
    pilotsFlying,
    pilotsInGoal,
    bestDistance,
  } = stats;

  const taskDistance = formula.taskDistance || bestDistance;

  // Goal ratio affects time/arrival weight
  const goalRatio = pilotsFlying > 0 ? pilotsInGoal / pilotsFlying : 0;

  // Distance weight (always present)
  // Higher when fewer pilots reach goal
  const distanceWeight = 1 - goalRatio;

  // Time weight (only when pilots in goal)
  // Linear with goal ratio
  let timeWeight = goalRatio;

  // Arrival weight (optional, GAP2020+ often 0)
  let arrivalWeight = 0;
  if (formula.useArrivalPoints) {
    arrivalWeight = goalRatio * formula.arrivalFraction;
    timeWeight -= arrivalWeight;
  }

  // Leading weight (from remaining time portion)
  const leadingWeight = formula.useLeadingPoints
    ? timeWeight * formula.leadingFraction
    : 0;
  timeWeight -= leadingWeight;

  // Departure weight (usually 0 in modern formulas)
  const departureWeight = formula.useDeparturePoints
    ? timeWeight * formula.departureFraction
    : 0;
  timeWeight -= departureWeight;

  return {
    distanceWeight: Math.max(0, distanceWeight),
    timeWeight: Math.max(0, timeWeight),
    arrivalWeight: Math.max(0, arrivalWeight),
    leadingWeight: Math.max(0, leadingWeight),
    departureWeight: Math.max(0, departureWeight),
  };
}

/**
 * Calculate available points per category (GAP.cs lines 382-420)
 */
export function calculateAvailablePoints(
  weights: PointWeights,
  dayQuality: number,
  pilotsFlying: number
): AvailablePoints {
  // Base available = 1000 * dayQuality
  const totalAvailable = 1000 * dayQuality;

  return {
    totalAvailable,
    distanceAvailable: totalAvailable * weights.distanceWeight,
    timeAvailable: totalAvailable * weights.timeWeight,
    arrivalAvailable: totalAvailable * weights.arrivalWeight,
    leadingAvailable: totalAvailable * weights.leadingWeight,
    departureAvailable: totalAvailable * weights.departureWeight,
  };
}

/**
 * GAP2023 specific weight adjustments
 */
export function applyGap2023Adjustments(
  weights: PointWeights,
  stats: TaskStatistics,
  formula: ScoringFormulaConfig
): PointWeights {
  // GAP2023 uses fixed leading weight factor
  const adjustedWeights = { ...weights };

  if (formula.leadingWeightFactor !== undefined) {
    const factor = formula.leadingWeightFactor;
    const leadingAdjustment = adjustedWeights.leadingWeight * (factor - 1);
    adjustedWeights.leadingWeight *= factor;
    adjustedWeights.timeWeight -= leadingAdjustment;
  }

  return adjustedWeights;
}

/**
 * GAP2025 specific weight adjustments
 */
export function applyGap2025Adjustments(
  weights: PointWeights,
  stats: TaskStatistics,
  formula: ScoringFormulaConfig
): PointWeights {
  // GAP2025 introduces dynamic leading weight based on task characteristics
  const adjustedWeights = { ...weights };

  // Calculate dynamic factor based on speed section length
  const ssRatio = formula.speedSectionDistance / formula.taskDistance;
  const dynamicFactor = 0.8 + (0.4 * ssRatio); // 0.8 to 1.2

  adjustedWeights.leadingWeight *= dynamicFactor;
  const adjustment = weights.leadingWeight * (dynamicFactor - 1);
  adjustedWeights.timeWeight -= adjustment;

  return adjustedWeights;
}
```

---

## Leading Coefficient Calculators

Based on `FsSfGAP/LeadingCalculator/`:

```typescript
// src/main/scoring/leading/leadingCalculator.ts

import type { TimeDist, FlightAnalysis, ScoringFormulaConfig } from '../types';

export interface LeadingCalculatorResult {
  leadingCoeff: number;
  areaBeforeBest: number;
  areaAfterBest: number;
  totalArea: number;
}

export type LeadingCalculatorType = 'Classic' | 'PWC2019' | 'PWC2023';

/**
 * Base leading coefficient calculation
 */
export function calculateLeadingCoeff(
  analysis: FlightAnalysis,
  formula: ScoringFormulaConfig,
  taskLcMin: number
): LeadingCalculatorResult {
  const graph = analysis.timeDistanceGraph;

  if (!graph || graph.length < 2) {
    return { leadingCoeff: 0, areaBeforeBest: 0, areaAfterBest: 0, totalArea: 0 };
  }

  switch (formula.leadingCalculatorType) {
    case 'PWC2023':
      return calculatePwc2023(graph, formula, taskLcMin);
    case 'PWC2019':
      return calculatePwc2019(graph, formula, taskLcMin);
    default:
      return calculateClassic(graph, formula, taskLcMin);
  }
}
```

### Classic Calculator

```typescript
// src/main/scoring/leading/classicCalculator.ts

/**
 * Classic LC calculation (LeadingCalculatorClassic.cs)
 * Uses simple area under time-distance curve
 */
export function calculateClassic(
  graph: TimeDist[],
  formula: ScoringFormulaConfig,
  taskLcMin: number
): LeadingCalculatorResult {
  let totalArea = 0;

  // Calculate area under curve using trapezoidal integration
  for (let i = 1; i < graph.length; i++) {
    const prev = graph[i - 1];
    const curr = graph[i];

    // Time delta in seconds
    const dt = curr.time - prev.time;

    // Distance to ESS (decreasing as pilot progresses)
    const avgDist2es = (prev.dist2es + curr.dist2es) / 2;

    // Area contribution (time * remaining distance)
    totalArea += dt * avgDist2es;
  }

  // Normalize by task LC minimum
  const leadingCoeff = taskLcMin > 0 ? totalArea / taskLcMin : totalArea;

  return {
    leadingCoeff,
    areaBeforeBest: totalArea,
    areaAfterBest: 0,
    totalArea,
  };
}
```

### PWC 2019 Calculator

```typescript
// src/main/scoring/leading/pwc2019Calculator.ts

/**
 * PWC 2019 LC calculation (LeadingCalculatorPwc2019.cs)
 * Introduces squared distance weighting
 */
export function calculatePwc2019(
  graph: TimeDist[],
  formula: ScoringFormulaConfig,
  taskLcMin: number
): LeadingCalculatorResult {
  const ssDistance = formula.speedSectionDistance;
  let areaBeforeBest = 0;
  let areaAfterBest = 0;

  // Find best (minimum) distance to ESS achieved
  const bestDist2es = Math.min(...graph.map(p => p.dist2es));

  for (let i = 1; i < graph.length; i++) {
    const prev = graph[i - 1];
    const curr = graph[i];

    const dt = curr.time - prev.time;

    // Squared distance weighting
    const prevWeight = Math.pow(prev.dist2es / ssDistance, 2);
    const currWeight = Math.pow(curr.dist2es / ssDistance, 2);
    const avgWeight = (prevWeight + currWeight) / 2;

    const contribution = dt * avgWeight;

    // Split into before/after best point
    if (curr.dist2es <= bestDist2es * 1.01) {
      areaBeforeBest += contribution;
    } else {
      areaAfterBest += contribution;
    }
  }

  const totalArea = areaBeforeBest + areaAfterBest;
  const leadingCoeff = taskLcMin > 0 ? totalArea / taskLcMin : totalArea;

  return {
    leadingCoeff,
    areaBeforeBest,
    areaAfterBest,
    totalArea,
  };
}
```

### PWC 2023 Calculator

```typescript
// src/main/scoring/leading/pwc2023Calculator.ts

/**
 * PWC 2023 LC calculation (LeadingCalculatorPwc2023.cs)
 * Most sophisticated version with altitude compensation
 */
export function calculatePwc2023(
  graph: TimeDist[],
  formula: ScoringFormulaConfig,
  taskLcMin: number
): LeadingCalculatorResult {
  const ssDistance = formula.speedSectionDistance;
  const essAltitude = formula.essAltitude || 0;
  const altitudeBonus = formula.altitudeBonusFactor || 0;

  let areaBeforeBest = 0;
  let areaAfterBest = 0;

  // Find best position achieved
  const bestDist2es = Math.min(...graph.map(p => p.dist2es));

  for (let i = 1; i < graph.length; i++) {
    const prev = graph[i - 1];
    const curr = graph[i];

    const dt = curr.time - prev.time;

    // Base distance weighting (squared)
    const prevDistWeight = Math.pow(prev.dist2es / ssDistance, 2);
    const currDistWeight = Math.pow(curr.dist2es / ssDistance, 2);

    // Altitude bonus calculation
    // Pilots higher than ESS get bonus, lower get penalty
    const prevAltBonus = calculateAltitudeBonus(prev.alt, essAltitude, altitudeBonus);
    const currAltBonus = calculateAltitudeBonus(curr.alt, essAltitude, altitudeBonus);

    // Combined weight with altitude adjustment
    const prevWeight = prevDistWeight * (1 + prevAltBonus);
    const currWeight = currDistWeight * (1 + currAltBonus);

    const avgWeight = (prevWeight + currWeight) / 2;
    const contribution = dt * avgWeight;

    // Split by position relative to best
    if (curr.dist2es <= bestDist2es * 1.01) {
      areaBeforeBest += contribution;
    } else {
      areaAfterBest += contribution;
    }
  }

  const totalArea = areaBeforeBest + areaAfterBest;
  const leadingCoeff = taskLcMin > 0 ? totalArea / taskLcMin : totalArea;

  return {
    leadingCoeff,
    areaBeforeBest,
    areaAfterBest,
    totalArea,
  };
}

function calculateAltitudeBonus(
  altitude: number,
  essAltitude: number,
  factor: number
): number {
  if (factor <= 0) return 0;

  const altDiff = altitude - essAltitude;
  // Positive diff = above ESS = bonus
  // Negative diff = below ESS = penalty
  return (altDiff / 1000) * factor; // Per 1000m
}
```

---

## Point Calculations

### Distance Points

```typescript
// src/main/scoring/points/distancePoints.ts

import type { FlightAnalysis, TaskStatistics, AvailablePoints } from '../types';

/**
 * Calculate distance points (GAP.cs lines 500-580)
 */
export function calculateDistancePoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  linearDistance: number
): number {
  const { distanceFlown } = analysis;
  const { bestDistance, minDistance } = stats;

  // Pilots below minimum get 0
  if (distanceFlown <= minDistance) {
    return 0;
  }

  // Distance over minimum
  const distOverMin = distanceFlown - minDistance;
  const bestOverMin = bestDistance - minDistance;

  if (bestOverMin <= 0) {
    return 0;
  }

  // Linear portion (always awarded)
  const linearFraction = distOverMin / bestOverMin;
  const linearPoints = linearFraction * linearDistance;

  // Difficulty portion (remaining points)
  const difficultyAvailable = available.distanceAvailable - linearDistance;
  const difficultyPoints = calculateDifficultyPoints(
    distanceFlown,
    bestDistance,
    minDistance,
    difficultyAvailable
  );

  return linearPoints + difficultyPoints;
}

/**
 * Difficulty points reward pilots who fly further relative to task difficulty
 */
function calculateDifficultyPoints(
  distance: number,
  bestDistance: number,
  minDistance: number,
  available: number
): number {
  // Difficulty increases with distance
  const distRatio = (distance - minDistance) / (bestDistance - minDistance);

  // Exponential curve rewards longer flights more
  const difficultyFactor = Math.pow(distRatio, 1.5);

  return difficultyFactor * available;
}
```

### Time Points

```typescript
// src/main/scoring/points/timePoints.ts

import type { FlightAnalysis, TaskStatistics, AvailablePoints, ScoringFormulaConfig } from '../types';

/**
 * Calculate time points (GAP.cs lines 600-680)
 */
export function calculateTimePoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig
): number {
  // Only goal finishers get time points
  if (!analysis.reachedGoal || !analysis.startTime || !analysis.essTime) {
    return 0;
  }

  const pilotTime = (analysis.essTime - analysis.startTime) / 1000; // seconds
  const bestTime = stats.bestTime;

  if (bestTime <= 0) {
    return 0;
  }

  // Time fraction calculation
  const timeFraction = calcTimeFraction(
    pilotTime,
    bestTime,
    formula.useFlatDecline
  );

  return timeFraction * available.timeAvailable;
}

/**
 * Time fraction formula (GAP.cs lines 1159-1173)
 */
export function calcTimeFraction(
  time: number,
  bestTime: number,
  useFlatDecline: boolean
): number {
  if (time <= 0 || bestTime <= 0) return 0;

  const timeDiff = time - bestTime;

  if (timeDiff < 0) {
    // Faster than best (shouldn't happen, but handle gracefully)
    return 1;
  }

  if (timeDiff === 0) {
    return 1;
  }

  // Exponent: 5/6 for flat decline (GAP2020+), 2/3 for steep decline
  const exponent = useFlatDecline ? 5 / 6 : 2 / 3;

  // Formula: 1 - (timeDiff / sqrt(bestTime))^exponent
  const base = timeDiff / Math.sqrt(bestTime);
  const fraction = 1 - Math.pow(base, exponent);

  return Math.max(0, fraction);
}
```

### Arrival Points

```typescript
// src/main/scoring/points/arrivalPoints.ts

import type { FlightAnalysis, TaskStatistics, AvailablePoints, ScoringFormulaConfig } from '../types';

/**
 * Calculate arrival points (GAP.cs lines 700-780)
 * Rewards pilots for finishing earlier in wall-clock time
 */
export function calculateArrivalPoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig,
  allAnalyses: FlightAnalysis[]
): number {
  if (!formula.useArrivalPoints || available.arrivalAvailable <= 0) {
    return 0;
  }

  if (!analysis.reachedGoal || !analysis.essTime) {
    return 0;
  }

  // Get finish position (1-based)
  const position = getFinishPosition(analysis, allAnalyses);
  const totalFinishers = stats.pilotsInGoal;

  if (totalFinishers <= 1) {
    return available.arrivalAvailable; // First place gets all
  }

  // Arrival fraction based on position
  const arrivalFraction = calcArrivalFraction(
    position,
    totalFinishers,
    formula.arrivalMethod
  );

  return arrivalFraction * available.arrivalAvailable;
}

function getFinishPosition(
  analysis: FlightAnalysis,
  allAnalyses: FlightAnalysis[]
): number {
  const finishTimes = allAnalyses
    .filter(a => a.reachedGoal && a.essTime)
    .map(a => ({ pilotId: a.pilotId, time: a.essTime! }))
    .sort((a, b) => a.time - b.time);

  const position = finishTimes.findIndex(f => f.pilotId === analysis.pilotId);
  return position + 1; // 1-based
}

function calcArrivalFraction(
  position: number,
  total: number,
  method: 'Position' | 'Time'
): number {
  // Position-based method
  // First place = 1, last place approaches 0
  const positionRatio = (total - position + 1) / total;

  // Apply curve to spread out points
  return Math.pow(positionRatio, 0.667);
}
```

### Leading Points

```typescript
// src/main/scoring/points/leadingPoints.ts

import type { FlightAnalysis, TaskStatistics, AvailablePoints, ScoringFormulaConfig } from '../types';
import { calculateLeadingCoeff } from '../leading/leadingCalculator';

/**
 * Calculate leading points (GAP.cs lines 967-993)
 */
export function calculateLeadingPoints(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig,
  taskLcMin: number
): number {
  if (!formula.useLeadingPoints || available.leadingAvailable <= 0) {
    return 0;
  }

  // Must reach ESS to get leading points
  if (!analysis.essTime) {
    return 0;
  }

  const lcResult = calculateLeadingCoeff(analysis, formula, taskLcMin);
  const lc = lcResult.leadingCoeff;

  if (lc <= 0) {
    return 0;
  }

  const smallestLc = stats.smallestLeadingCoeff;

  if (smallestLc <= 0) {
    return available.leadingAvailable; // Best LC gets all points
  }

  // Leading fraction formula
  const lcDiff = Math.max(0, lc - smallestLc);
  const leadingFraction = 1 - Math.pow(lcDiff / Math.sqrt(smallestLc), 2 / 3);

  const points = Math.max(0, leadingFraction) * available.leadingAvailable;

  return Math.min(points, available.leadingAvailable);
}

/**
 * Calculate task LC minimum (for normalization)
 */
export function calculateTaskLcMin(
  allAnalyses: FlightAnalysis[],
  formula: ScoringFormulaConfig
): number {
  const lcValues = allAnalyses
    .filter(a => a.essTime)
    .map(a => {
      const result = calculateLeadingCoeff(a, formula, 1);
      return result.totalArea;
    })
    .filter(lc => lc > 0);

  return lcValues.length > 0 ? Math.min(...lcValues) : 1;
}
```

---

## Task Scorer Orchestrator

```typescript
// src/main/scoring/scoring/taskScorer.ts

import type {
  TaskDefinition,
  FlightAnalysis,
  TaskResult,
  ScoringFormulaConfig,
  PilotResult,
} from '../types';
import { calculateTaskStatistics } from '../core/taskStatistics';
import {
  calcTimeValidity,
  calcLaunchValidity,
  calcDistanceValidity,
  calcStopValidity,
  calcDayQuality,
} from '../core/validity';
import { calculateWeights, calculateAvailablePoints } from '../core/weights';
import { calculateDistancePoints } from '../points/distancePoints';
import { calculateTimePoints } from '../points/timePoints';
import { calculateArrivalPoints } from '../points/arrivalPoints';
import { calculateLeadingPoints, calculateTaskLcMin } from '../points/leadingPoints';

export interface ScoringOptions {
  task: TaskDefinition;
  analyses: FlightAnalysis[];
  formula: ScoringFormulaConfig;
  onProgress?: (percent: number, message: string) => void;
}

export async function scoreTask(options: ScoringOptions): Promise<TaskResult> {
  const { task, analyses, formula, onProgress } = options;

  onProgress?.(5, 'Calculating task statistics...');

  // Step 1: Calculate statistics
  const stats = calculateTaskStatistics(task, analyses, formula);

  onProgress?.(15, 'Calculating validity...');

  // Step 2: Calculate validities
  const timeValidity = calcTimeValidity(stats, formula);
  const launchValidity = calcLaunchValidity(stats, formula);
  const distanceValidity = calcDistanceValidity(stats, formula);
  const stopValidity = calcStopValidity(stats, formula, task.state);
  const dayQuality = calcDayQuality(timeValidity, launchValidity, distanceValidity, stopValidity);

  onProgress?.(25, 'Calculating weights...');

  // Step 3: Calculate weights and available points
  let weights = calculateWeights(stats, formula, dayQuality);

  // Apply formula-specific adjustments
  if (formula.name === 'GAP2025') {
    weights = applyGap2025Adjustments(weights, stats, formula);
  } else {
    weights = applyGap2023Adjustments(weights, stats, formula);
  }

  const available = calculateAvailablePoints(weights, dayQuality, stats.pilotsFlying);

  onProgress?.(30, 'Calculating leading coefficient minimum...');

  // Step 4: Calculate task LC minimum for normalization
  const taskLcMin = calculateTaskLcMin(analyses, formula);

  // Step 5: Score each pilot
  const pilotResults: PilotResult[] = [];
  const total = analyses.length;

  for (let i = 0; i < total; i++) {
    const analysis = analyses[i];
    const percent = 30 + Math.round((i / total) * 60);
    onProgress?.(percent, `Scoring pilot ${i + 1} of ${total}...`);

    const result = scorePilot(analysis, stats, available, formula, taskLcMin, analyses);
    pilotResults.push(result);
  }

  onProgress?.(90, 'Calculating rankings...');

  // Step 6: Sort and assign rankings
  pilotResults.sort((a, b) => b.totalPoints - a.totalPoints);

  let rank = 1;
  for (let i = 0; i < pilotResults.length; i++) {
    if (i > 0 && pilotResults[i].totalPoints < pilotResults[i - 1].totalPoints) {
      rank = i + 1;
    }
    pilotResults[i].rank = rank;
  }

  onProgress?.(100, 'Scoring complete');

  return {
    taskId: task.id,
    taskName: task.name,
    taskDate: task.date,
    scoredAt: new Date().toISOString(),
    formula: formula.name,

    // Validity scores
    timeValidity,
    launchValidity,
    distanceValidity,
    stopValidity,
    dayQuality,

    // Available points
    availablePoints: available,

    // Statistics
    statistics: stats,

    // Results
    pilotResults,
  };
}

function scorePilot(
  analysis: FlightAnalysis,
  stats: TaskStatistics,
  available: AvailablePoints,
  formula: ScoringFormulaConfig,
  taskLcMin: number,
  allAnalyses: FlightAnalysis[]
): PilotResult {
  // Calculate linear distance points threshold
  const linearDistance = available.distanceAvailable * 0.3; // 30% linear

  // Calculate each point category
  const distancePoints = calculateDistancePoints(analysis, stats, available, linearDistance);
  const timePoints = calculateTimePoints(analysis, stats, available, formula);
  const arrivalPoints = calculateArrivalPoints(analysis, stats, available, formula, allAnalyses);
  const leadingPoints = calculateLeadingPoints(analysis, stats, available, formula, taskLcMin);

  // Sum points
  let totalPoints = distancePoints + timePoints + arrivalPoints + leadingPoints;

  // Apply penalties (if any)
  const penalties = analysis.penalties || [];
  const penaltyPoints = penalties.reduce((sum, p) => sum + p.points, 0);
  totalPoints = Math.max(0, totalPoints - penaltyPoints);

  return {
    pilotId: analysis.pilotId,
    rank: 0, // Set later after sorting

    // Flight data
    distance: analysis.distanceFlown,
    time: analysis.startTime && analysis.essTime
      ? (analysis.essTime - analysis.startTime) / 1000
      : null,
    reachedGoal: analysis.reachedGoal,
    reachedESS: !!analysis.essTime,

    // Point breakdown
    distancePoints,
    timePoints,
    arrivalPoints,
    leadingPoints,
    departurePoints: 0, // Not used in GAP2023+

    // Penalties
    penalties,
    penaltyPoints,

    // Total
    totalPoints,
  };
}
```

---

## Formula Registry

```typescript
// src/main/scoring/formulas/index.ts

import type { ScoringFormulaConfig } from '../types';

export const GAP2023_DEFAULTS: Partial<ScoringFormulaConfig> = {
  name: 'GAP2023',
  nominalDistance: 50000,      // 50 km
  nominalTime: 5400,           // 90 minutes
  nominalGoal: 0.2,            // 20%
  nominalLaunch: 0.96,         // 96%
  minimumDistance: 7000,       // 7 km
  useLeadingPoints: true,
  useArrivalPoints: false,
  useDeparturePoints: false,
  leadingFraction: 0.26,
  leadingCalculatorType: 'PWC2023',
  leadingWeightFactor: 1.0,
  useFlatDecline: true,
  altitudeBonusFactor: 0,
};

export const GAP2025_DEFAULTS: Partial<ScoringFormulaConfig> = {
  ...GAP2023_DEFAULTS,
  name: 'GAP2025',
  leadingWeightFactor: 1.0,
  altitudeBonusFactor: 0.05,   // 5% per 1000m
  // Additional GAP2025-specific parameters
};

export function getFormulaDefaults(name: string): Partial<ScoringFormulaConfig> {
  switch (name) {
    case 'GAP2025':
      return GAP2025_DEFAULTS;
    case 'GAP2023':
    default:
      return GAP2023_DEFAULTS;
  }
}

export function createFormulaConfig(
  base: string,
  overrides: Partial<ScoringFormulaConfig>
): ScoringFormulaConfig {
  const defaults = getFormulaDefaults(base);
  return {
    ...defaults,
    ...overrides,
  } as ScoringFormulaConfig;
}
```

---

## Validation Checklist

- [ ] Time validity matches FS within 0.001
- [ ] Launch validity matches FS within 0.001
- [ ] Distance validity matches FS within 0.001
- [ ] Day quality matches FS within 0.001
- [ ] Weight distribution matches FS
- [ ] Distance points match FS within 0.1
- [ ] Time points match FS within 0.1
- [ ] Leading points match FS within 0.1
- [ ] Total points match FS within 1.0
- [ ] Rankings match FS exactly

## Next Phase

[Phase 5: Results & UI](./phase-5-results-ui.md) - Display and export scored results
