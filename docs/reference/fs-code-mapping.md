# FS to TypeScript Code Mapping

This document maps the original FS C# codebase to the TypeScript implementation.

## Source File Mapping

| FS C# File | TypeScript Module | Purpose |
|------------|-------------------|---------|
| `FsSfGAP/GAP.cs` | `scoring/formulas/*.ts`, `scoring/core/*.ts`, `scoring/points/*.ts` | Main scoring engine |
| `FsTaskFlight/Flight.cs` | `scoring/analysis/*.ts` | Flight analysis |
| `FsFsdb/ScoreFormulaParameter.cs` | `scoring/types/formula.ts` | Formula parameters |
| `FsSfGAP/LeadingCalculator/*.cs` | `scoring/leading/*.ts` | Leading coefficient |
| `FsUtil/XCTrack/Task_v1.cs` | `scoring/import/xctaskImporter.ts` | XCTrack parsing |
| `FsUtil/Geo/*.cs` | `scoring/geo/*.ts` | Geo utilities |

---

## GAP.cs Mapping (2,369 lines)

### Validity Calculations

| C# Method | C# Lines | TypeScript Function | TS File |
|-----------|----------|---------------------|---------|
| `CalcTimeValidity` | 187-208 | `calcTimeValidity()` | `core/validity.ts` |
| `CalcLaunchValidity` | 210-218 | `calcLaunchValidity()` | `core/validity.ts` |
| `CalcDistanceValidity` | 220-255 | `calcDistanceValidity()` | `core/validity.ts` |
| `CalcStopValidity` | 257-280 | `calcStopValidity()` | `core/validity.ts` |
| `CalcDayQuality` | 282-290 | `calcDayQuality()` | `core/validity.ts` |

### Weight Distribution

| C# Method | C# Lines | TypeScript Function | TS File |
|-----------|----------|---------------------|---------|
| `CalcWeights` | 300-380 | `calculateWeights()` | `core/weights.ts` |
| `CalcAvailablePoints` | 382-420 | `calculateAvailablePoints()` | `core/weights.ts` |

### Point Calculations

| C# Method | C# Lines | TypeScript Function | TS File |
|-----------|----------|---------------------|---------|
| `CalcDistancePoints` | 500-580 | `calculateDistancePoints()` | `points/distancePoints.ts` |
| `CalcDifficulty` | 582-620 | `calculateDifficultyPoints()` | `points/distancePoints.ts` |
| `CalcTimePoints` | 600-680 | `calculateTimePoints()` | `points/timePoints.ts` |
| `CalcTimeFraction` | 1159-1173 | `calcTimeFraction()` | `points/timePoints.ts` |
| `CalcArrivalPoints` | 700-780 | `calculateArrivalPoints()` | `points/arrivalPoints.ts` |
| `CalcLeadingPoints` | 967-993 | `calculateLeadingPoints()` | `points/leadingPoints.ts` |

### Orchestration

| C# Method | C# Lines | TypeScript Function | TS File |
|-----------|----------|---------------------|---------|
| `ScoreTask` | 100-185 | `scoreTask()` | `scoring/taskScorer.ts` |
| `ScorePilot` | 800-900 | `scorePilot()` | `scoring/taskScorer.ts` |
| `CalcRankings` | 1200-1250 | (inline in `scoreTask`) | `scoring/taskScorer.ts` |

---

## Flight.cs Mapping (1,464 lines)

### Turnpoint Detection

| C# Method | C# Lines | TypeScript Function | TS File |
|-----------|----------|---------------------|---------|
| `FindCrossings` | 423-520 | `findAllCrossings()` | `analysis/turnpointDetector.ts` |
| `GetValidCrossings` | 522-580 | `getValidCrossings()` | `analysis/turnpointDetector.ts` |
| `DetectCylinderCrossing` | 689-752 | (inline in `findAllCrossings`) | `analysis/turnpointDetector.ts` |
| `InterpolateCrossing` | 754-800 | (inline in `findAllCrossings`) | `analysis/turnpointDetector.ts` |

### Distance Calculation

| C# Method | C# Lines | TypeScript Function | TS File |
|-----------|----------|---------------------|---------|
| `CalcDistanceFlown` | 910-1000 | `calculateFlownDistance()` | `analysis/distanceCalculator.ts` |
| `CalcDistanceToGoal` | 1002-1050 | `calculateDistanceToGoal()` | `analysis/distanceCalculator.ts` |
| `FindBestDistance` | 1052-1122 | (inline in `calculateFlownDistance`) | `analysis/distanceCalculator.ts` |

### Time-Distance Graph

| C# Method | C# Lines | TypeScript Function | TS File |
|-----------|----------|---------------------|---------|
| `BuildTimeDistGraph` | 600-688 | `generateTimeDistanceGraph()` | `analysis/timeDistanceGraph.ts` |
| `CalcDistToTurnpoint` | 1124-1180 | `calculateDistanceToTurnpoint()` | `analysis/timeDistanceGraph.ts` |

### Flight Analysis Coordinator

| C# Method | C# Lines | TypeScript Function | TS File |
|-----------|----------|---------------------|---------|
| `AnalyzeFlight` | 100-200 | `analyzeFlightForTask()` | `analysis/flightAnalyzer.ts` |
| `ParseIgc` | 50-98 | `parseIGC()` | `lib/igc-parser.ts` |
| `ValidateFlight` | 202-280 | (inline in `analyzeFlightForTask`) | `analysis/flightAnalyzer.ts` |

---

## LeadingCalculator Mapping

### LeadingCalculatorClassic.cs

| C# Method | TypeScript Function | TS File |
|-----------|---------------------|---------|
| `Calculate` | `calculateClassic()` | `leading/classicCalculator.ts` |
| `CalcArea` | (inline) | `leading/classicCalculator.ts` |

### LeadingCalculatorPwc2019.cs

| C# Method | TypeScript Function | TS File |
|-----------|---------------------|---------|
| `Calculate` | `calculatePwc2019()` | `leading/pwc2019Calculator.ts` |
| `CalcSquaredWeight` | (inline) | `leading/pwc2019Calculator.ts` |

### LeadingCalculatorPwc2023.cs

| C# Method | TypeScript Function | TS File |
|-----------|---------------------|---------|
| `Calculate` | `calculatePwc2023()` | `leading/pwc2023Calculator.ts` |
| `CalcAltitudeBonus` | `calculateAltitudeBonus()` | `leading/pwc2023Calculator.ts` |

---

## ScoreFormulaParameter.cs Mapping (778 lines)

### Parameter Definitions

| C# Property | TypeScript Property | Type | Default |
|-------------|---------------------|------|---------|
| `NominalDistance` | `nominalDistance` | `number` | 50000 |
| `NominalTime` | `nominalTime` | `number` | 5400 |
| `NominalGoal` | `nominalGoal` | `number` | 0.2 |
| `NominalLaunch` | `nominalLaunch` | `number` | 0.96 |
| `MinimumDistance` | `minimumDistance` | `number` | 7000 |
| `UseLeading` | `useLeadingPoints` | `boolean` | true |
| `UseArrival` | `useArrivalPoints` | `boolean` | false |
| `UseDeparture` | `useDeparturePoints` | `boolean` | false |
| `LeadingFraction` | `leadingFraction` | `number` | 0.26 |
| `LeadingWeightFactor` | `leadingWeightFactor` | `number` | 1.0 |
| `LeadingCalculatorType` | `leadingCalculatorType` | `string` | 'PWC2023' |
| `UseFlatDecline` | `useFlatDecline` | `boolean` | true |
| `FtvFactor` | `ftvFactor` | `number` | 0 |

---

## Geo Utilities Mapping

### Distance.cs

| C# Method | TypeScript Function | TS File |
|-----------|---------------------|---------|
| `Haversine` | `haversineDistance()` | `geo/distance.ts` |
| `Wgs84Andoyer` | `distanceWgs84Andoyer()` | `geo/distance.ts` |

### ShortestRoute.cs

| C# Method | TypeScript Function | TS File |
|-----------|---------------------|---------|
| `CalcShortestRoute` | `calculateTaskDistances()` | `geo/shortestRoute.ts` |
| `OptimizeRoute` | `optimizeRoute()` | `geo/shortestRoute.ts` |
| `FindOptimalPoint` | `findOptimalCylinderPoint()` | `geo/shortestRoute.ts` |

---

## Type Mapping

### C# to TypeScript Types

| C# Type | TypeScript Type |
|---------|-----------------|
| `int` | `number` |
| `double` | `number` |
| `decimal` | `number` |
| `string` | `string` |
| `bool` | `boolean` |
| `DateTime` | `Date` or `string` (ISO) |
| `List<T>` | `T[]` |
| `Dictionary<K,V>` | `Record<K,V>` or `Map<K,V>` |
| `Nullable<T>` | `T \| null` |
| `enum` | `type` (union) or `enum` |

### Class to Interface/Type

| C# Class | TypeScript Interface |
|----------|---------------------|
| `Flight` | `FlightAnalysis` |
| `Task` | `TaskDefinition` |
| `Pilot` | `Participant` |
| `TaskResult` | `TaskResult` |
| `PilotResult` | `PilotResult` |
| `ScoreFormula` | `ScoringFormulaConfig` |
| `Turnpoint` | `Turnpoint` |
| `GeoPoint` | `GeoPoint` |
| `TimeDist` | `TimeDist` |

---

## Code Pattern Translations

### C# Property to TypeScript

```csharp
// C#
public class Pilot
{
    public int Id { get; set; }
    public string Name { get; set; }
    public double? DistanceFlown { get; set; }
}
```

```typescript
// TypeScript
interface Pilot {
  id: number;
  name: string;
  distanceFlown: number | null;
}
```

### C# Method to TypeScript Function

```csharp
// C#
public double CalcTimeValidity(double bestTime, double nomTime)
{
    var tvRaw = Math.Min(bestTime / nomTime, 1.0);
    return Math.Max(0, Math.Min(1,
        -0.271 + 2.912 * tvRaw - 2.098 * Math.Pow(tvRaw, 2) + 0.457 * Math.Pow(tvRaw, 3)
    ));
}
```

```typescript
// TypeScript
function calcTimeValidity(bestTime: number, nomTime: number): number {
  const tvRaw = Math.min(bestTime / nomTime, 1.0);
  return Math.max(0, Math.min(1,
    -0.271 + 2.912 * tvRaw - 2.098 * Math.pow(tvRaw, 2) + 0.457 * Math.pow(tvRaw, 3)
  ));
}
```

### C# LINQ to TypeScript

```csharp
// C#
var goalFinishers = flights
    .Where(f => f.ReachedGoal)
    .OrderBy(f => f.EssTime)
    .ToList();
```

```typescript
// TypeScript
const goalFinishers = flights
  .filter(f => f.reachedGoal)
  .sort((a, b) => (a.essTime ?? 0) - (b.essTime ?? 0));
```

### C# Null Handling to TypeScript

```csharp
// C#
var time = flight.EssTime ?? 0;
var hasGoal = flight.GoalTime.HasValue;
```

```typescript
// TypeScript
const time = flight.essTime ?? 0;
const hasGoal = flight.goalTime !== undefined;
```

---

## Key Algorithm Locations

### Finding Specific Algorithms in FS

| Algorithm | C# File | Line Range |
|-----------|---------|------------|
| Time Validity Polynomial | GAP.cs | 187-208 |
| Launch Validity Polynomial | GAP.cs | 210-218 |
| Time Fraction Formula | GAP.cs | 1159-1173 |
| Leading Points Formula | GAP.cs | 967-993 |
| Cylinder Crossing Detection | Flight.cs | 689-752 |
| Shortest Route Optimization | ShortestRoute.cs | 50-150 |
| PWC2023 LC Algorithm | LeadingCalculatorPwc2023.cs | 20-80 |

---

## Testing Reference Points

### Key Values for Validation

When validating the port, compare these outputs:

1. **Validity Calculations** (GAP.cs lines 282-290)
   - Day quality should match to 4 decimal places

2. **Distance Points** (GAP.cs lines 500-580)
   - Should match to 1 decimal place

3. **Time Points** (GAP.cs lines 600-680)
   - Should match to 1 decimal place

4. **Leading Points** (GAP.cs lines 967-993)
   - Should match to 1 decimal place

5. **Total Points**
   - Should match to 0 decimal places (integer)

6. **Rankings**
   - Should match exactly
