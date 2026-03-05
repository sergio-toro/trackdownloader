# GAP2023 Scoring Rules

Complete reference for the GAP2023 scoring formula as implemented by FS (FAI Scoring Software) and this codebase.

## Overview

GAP2023 is the official CIVL scoring formula for paragliding competitions. It calculates pilot scores based on four components:
- **Distance Points** — how far the pilot flew
- **Time Points** — how fast goal finishers completed the task
- **Leading Points** — reward for leading the race
- **Arrival Points** — not used in GAP2023 PG

The total available points per task is **1000 × Day Quality**.

---

## 1. Day Quality

Day Quality measures the quality of a competition task. It ranges from 0 to 1.

```
DayQuality = TimeValidity × LaunchValidity × DistanceValidity × StopValidity
```

### 1.1 Time Validity

Measures if the task had meaningful racing. Higher when the best time/distance approaches nominal values.

```
x = min(bestTime / nominalTime, 1)
  (or min(bestDistance / nominalDistance, 1) if no goal finishers)

TV = -0.271 + 2.912x - 2.098x² + 0.457x³
```

Clamped to [0, 1].

### 1.2 Launch Validity

Penalizes when fewer pilots launch than expected.

```
expectedLaunchers = pilotsPresent × nominalLaunch
lvRaw = min(pilotsFlying / expectedLaunchers, 1)

LV = 0.028 × lvRaw + 2.917 × lvRaw² - 1.944 × lvRaw³
```

### 1.3 Distance Validity

Measures spread of pilot distances.

```
avgDistOverMin = sumOfFlownDistancesOverMin / pilotsFlying
nomDistOverMin = nominalDistance - minimumDistance

DV = clamp(avgDistOverMin / nomDistOverMin, 0, 1)
```

### 1.4 Stop Validity

Only applies to stopped tasks. Returns 1.0 for regular tasks.

---

## 2. Weight Distribution

Points are distributed between distance and speed (time + leading) based on the **goal ratio**.

```
goalRatio = pilotsInGoal / pilotsFlying

distanceWeight = 0.9 - 1.665×gr + 1.713×gr² - 0.587×gr³
speedWeight = 1 - distanceWeight

leadingWeight = speedWeight × leadingFraction   (leadingFraction = 0.26)
timeWeight = speedWeight - leadingWeight
```

### Available Points

```
totalAvailable = 1000 × dayQuality

distanceAvailable = totalAvailable × distanceWeight
timeAvailable = totalAvailable × timeWeight
leadingAvailable = totalAvailable × leadingWeight
```

### Example (Lliga A T05, goalRatio = 10/41 = 0.2439)

| Category | Weight | Available |
|----------|--------|-----------|
| Distance | 0.5873 | 587.3 |
| Time | 0.3054 | 305.4 |
| Leading | 0.1073 | 107.3 |
| **Total** | **1.0** | **1000** |

---

## 3. Distance Points

For PG competitions (no difficulty), distance points use a simple linear formula:

```
DistancePoints = (distanceFlown / bestDistance) × distanceAvailable
```

Where:
- `distanceFlown` = pilot's distance, floored at `minimumDistance` (typically 5 km)
- `bestDistance` = maximum distance among all pilots (= task distance if anyone reached goal)

**Notes:**
- No subtraction of minimum distance from the ratio
- No difficulty exponent for PG (`useDifficultyForDistancePoints = false`)
- Goal finishers get `distanceFlown = taskDistance`

---

## 4. Time Points

Only **goal finishers** receive time points. The formula uses a declining curve.

```
pilotTime = (essTime - startTime)   // race time in speed section
timeDiff = pilotTime - bestTime

base = timeDiff / (60 × √bestTime)
timeFraction = max(0, 1 - base^(5/6))

TimePoints = timeFraction × timeAvailable
```

Where:
- `bestTime` = fastest race time (seconds)
- The exponent `5/6` is the "flat decline" used in GAP2020+ (`useFlatDecline = true`)
- Older formulas use `2/3` exponent

**Maximum time to receive points:**

```
maxTimeDiff = 60 × √bestTime
maxRaceTime = bestTime + maxTimeDiff
```

For `bestTime = 7360s (2:02:40)`: maxTimeDiff = 5148s, maxRaceTime = 12508s (3:28:28)

---

## 5. Leading Points

Leading points reward pilots who spent time at the front of the race. They are calculated for **all pilots who crossed the Speed Section start (SS)**, not just ESS finishers.

### 5.1 Leading Coefficient (LC)

The LC is an integral measuring how much time a pilot spent at various distances from ESS:

```
LC = ∫(dt × (dist2es / ssDistance)²) / normFactor
```

Where:
- `dist2es` = distance remaining to ESS at each moment
- `ssDistance` = speed section distance (SS to ES)
- `dt` = time delta between consecutive fixes
- `normFactor` = 1800² (30 minutes squared, CIVL-GAP constant)

The integration runs from the pilot's SS crossing to their ESS crossing (or end of flight for non-ESS pilots).

### 5.2 Leading Time Ratio (useLeadingTimeRatio)

When enabled, non-ESS pilots' LC values are adjusted. The exact FS implementation is not fully documented. Based on investigation, it involves at least:

1. **Graph extension**: The time-distance graph is extended from the pilot's landing time to the task end time (last ESS crossing + score-back time). During this extension, the pilot's last dist2es value is held constant, accumulating additional LC area.

2. **Possible time ratio normalization**: FS may also divide the LC by the pilot's time fraction:
   ```
   timeRatio = min(1, pilotTimeInSS / taskTime)
   adjustedLC = rawLC / timeRatio
   ```
   However, applying both graph extension AND time ratio division produces results that are too aggressive (leading points too low). FS likely uses a combination or variation we haven't replicated.

**Current implementation**: Graph extension only. This matches well for pilots close to ESS (e.g., Clavera: 59.5 vs FS 57.8) but overshoots for pilots further from ESS.

These adjustments ensure that:
- Pilots who barely crossed SS get very high (bad) LCs → 0 leading points
- Pilots who flew far but didn't reach ESS get moderate LCs → some leading points
- Goal finishers are unaffected (their graph already ends at ESS)

### 5.3 Leading Fraction

```
lcRatio = pilotLC / smallestLC
leadingFraction = max(0, 1 - (lcRatio - 1)^(2/3))
LeadingPoints = leadingFraction × leadingAvailable
```

Where `smallestLC` = minimum LC among ESS pilots (the "best" leader).

**Cutoff**: Leading fraction = 0 when `lcRatio >= 2` (pilot's LC is more than double the best).

### 5.4 PWC2023 Calculator

GAP2023 uses the PWC2023 leading calculator:

```
weight(t) = (dist2es(t) / ssDistance)² × (1 - altitudeBonus)
```

For GAP2023, `altitudeBonusFactor = 0`, so altitude has no effect.
For GAP2025, `altitudeBonusFactor = 0.05` (5% per 1000m above ESS).

The area is split into "before best" (approaching closest position to ESS) and "after best" (moving away), summed for the total area.

---

## 6. Formula Parameters

### Competition Parameters (Lliga A)

| Parameter | Value | Description |
|-----------|-------|-------------|
| Nominal Launch | 96% | Expected launch percentage |
| Minimum Distance | 5 km | Floor for scored distances |
| Nominal Distance | 25 km | Expected average distance |
| Nominal Time | 1 hour | Expected winning time |
| Nominal Goal | 15% | Expected goal percentage |
| Score-back Time | 5 min | Time buffer for LC calculation |
| Leading Weight Factor | 1.00 | Multiplier for leading weight |
| Turnpoint Tolerance | 0.5%, 5m min | Cylinder crossing tolerance |

### Scoring Settings

| Setting | Value | Effect |
|---------|-------|--------|
| `useFlatDecline` | true | Time exponent = 5/6 (flatter) |
| `useLeadingTimeRatio` | true | Extend LC for non-ESS pilots |
| `useDifficultyForDistancePoints` | false | Linear distance points (PG) |
| `redistributeRemovedTimePointsAsDistancePoints` | true | Shifts weight to distance |
| `useLeadingPoints` | true | Enable leading coefficient |
| `leadingFraction` | 0.26 | 26% of speed weight goes to leading |
| `leadingCalculatorType` | PWC2023 | Calculator algorithm |
| `scoringAltitude` | GPS | Use GPS altitude, not QNH |
| `numberOfDecimalsTaskResults` | 1 | Round to 1 decimal place |

---

## 7. Scoring Pipeline

```
1. Parse IGC files → Flight Fixes
2. Detect turnpoint crossings (with tolerance bands)
3. Get valid crossings in sequence (TAKEOFF→SS→TPs→ES→GOAL)
4. Calculate flown distance (floor at minimumDistance)
5. Generate time-distance graph (for leading coefficient)
6. Calculate task statistics (pilot counts, best time/distance)
7. Calculate validities → day quality
8. Calculate weight distribution → available points
9. Calculate leading coefficients for all SS-crossed pilots
10. Score each pilot (distance + time + leading points)
11. Sort by total, assign rankings
```

---

## 8. Known Implementation Differences from FS

### Task Distance
- Our shortest route optimization gives ~65,331m vs FS ~65,361m (30m difference)
- Caused by planar approximation in route optimization (111,111 m/deg constant)
- Affects distance points by ~0.1 points for landed-out pilots

### Race Times
- SS/ES crossing times differ by 5-87 seconds between implementations
- Caused by different interpolation in crossing detection and radius tolerance handling
- Affects time points by 0.1-4.3 points for goal finishers

### Leading Coefficients
- LC values differ by ~2-3% from FS for goal pilots
- Caused by speedSectionDistance difference and graph resolution
- Leading points differ by 1-2 points for goal pilots, more for non-ESS pilots

### Total Score Differences
- Goal pilots: typically within ±3.5 points of FS reference
- Non-ESS pilots with leading points: differences depend on LC accuracy
- Landed-out pilots without leading points: within ±0.2 points

---

## References

- CIVL-GAP (GAP2023) specification
- FS R3.4 (FAI Scoring Software)
- `src/main/scoring/` — TypeScript implementation
