# Scoring Formulas Reference

Mathematical formulas used in GAP scoring, ported from FS `FsSfGAP/GAP.cs`.

## Day Quality

Day Quality is the product of four validity factors:

```
DayQuality = TimeValidity × LaunchValidity × DistanceValidity × StopValidity
```

Maximum value: 1.0 (100%)

---

## Validity Calculations

### Time Validity

Measures the quality of the racing based on the best time or distance achieved.

```typescript
function calcTimeValidity(bestTime: number, nomTime: number, bestDist: number, nomDist: number): number {
  // Raw ratio: use time if available, otherwise distance
  const tvRaw = bestTime > 0
    ? Math.min(bestTime / nomTime, 1)
    : Math.min(bestDist / nomDist, 1);

  // Polynomial transformation
  return Math.max(0, Math.min(1,
    -0.271 + 2.912 * tvRaw - 2.098 * tvRaw² + 0.457 * tvRaw³
  ));
}
```

**Source**: GAP.cs lines 187-208

### Launch Validity

Penalizes when fewer pilots launch than expected.

```typescript
function calcLaunchValidity(pilotsFlying: number, pilotsPresent: number, nomLaunch: number): number {
  const lvRaw = Math.min(1.0, pilotsFlying / (pilotsPresent * nomLaunch));

  // Polynomial transformation
  return Math.max(0, Math.min(1,
    0.028 * lvRaw + 2.917 * lvRaw² - 1.944 * lvRaw³
  ));
}
```

**Source**: GAP.cs lines 210-218

### Distance Validity

Measures pilot spread in terms of distance flown.

```typescript
function calcDistanceValidity(
  sumOfFlownDistancesOverMin: number,
  pilotsFlying: number,
  nomDistance: number,
  minDistance: number
): number {
  const nomDistOverMin = nomDistance - minDistance;
  const avgDistOverMin = sumOfFlownDistancesOverMin / pilotsFlying;

  return Math.max(0, Math.min(1, avgDistOverMin / nomDistOverMin));
}
```

**Source**: GAP.cs lines 220-255

### Stop Validity

Only applies to stopped tasks.

```typescript
function calcStopValidity(
  pilotsInGoal: number,
  pilotsFlying: number,
  bestDistance: number,
  taskDistance: number
): number {
  const goalFactor = pilotsInGoal / pilotsFlying;
  const distFactor = bestDistance / taskDistance;

  return Math.max(goalFactor, distFactor);
}
```

**Source**: GAP.cs lines 257-280

---

## Weight Distribution

Points are distributed across categories based on how many pilots reached goal.

### Base Weights

```typescript
goalRatio = pilotsInGoal / pilotsFlying

distanceWeight = 1 - goalRatio      // Higher when fewer reach goal
timeWeight = goalRatio              // Higher when more reach goal
```

### Adjusted Weights (with leading/arrival)

```typescript
// If using arrival points
arrivalWeight = goalRatio × arrivalFraction
timeWeight -= arrivalWeight

// If using leading points
leadingWeight = timeWeight × leadingFraction
timeWeight -= leadingWeight

// If using departure points
departureWeight = timeWeight × departureFraction
timeWeight -= departureWeight
```

### Available Points

```typescript
totalAvailable = 1000 × dayQuality

distanceAvailable = totalAvailable × distanceWeight
timeAvailable = totalAvailable × timeWeight
leadingAvailable = totalAvailable × leadingWeight
arrivalAvailable = totalAvailable × arrivalWeight
```

**Source**: GAP.cs lines 300-450

---

## Point Calculations

### Distance Points

Two components: linear and difficulty.

```typescript
function calcDistancePoints(
  distanceFlown: number,
  bestDistance: number,
  minDistance: number,
  availablePoints: number
): number {
  if (distanceFlown <= minDistance) return 0;

  const distOverMin = distanceFlown - minDistance;
  const bestOverMin = bestDistance - minDistance;

  // Linear portion (30% of available)
  const linearDistance = availablePoints * 0.3;
  const linearFraction = distOverMin / bestOverMin;
  const linearPoints = linearFraction * linearDistance;

  // Difficulty portion (70% of available)
  const difficultyAvailable = availablePoints - linearDistance;
  const difficultyFactor = (distOverMin / bestOverMin)^1.5;
  const difficultyPoints = difficultyFactor * difficultyAvailable;

  return linearPoints + difficultyPoints;
}
```

**Source**: GAP.cs lines 500-580

### Time Points

Only awarded to goal finishers.

```typescript
function calcTimePoints(
  pilotTime: number,
  bestTime: number,
  availablePoints: number,
  useFlatDecline: boolean
): number {
  if (pilotTime <= 0 || bestTime <= 0) return 0;

  const timeDiff = pilotTime - bestTime;
  if (timeDiff <= 0) return availablePoints;

  // Exponent: 5/6 for flat decline, 2/3 for steep
  const exponent = useFlatDecline ? 5/6 : 2/3;

  // Time fraction formula
  const fraction = 1 - (timeDiff / √bestTime)^exponent;

  return Math.max(0, fraction) * availablePoints;
}
```

**Source**: GAP.cs lines 1159-1173

### Leading Points

Rewards pilots who lead the race.

```typescript
function calcLeadingPoints(
  leadingCoeff: number,
  smallestLc: number,
  availablePoints: number
): number {
  if (leadingCoeff <= 0) return 0;

  const lcDiff = Math.max(0, leadingCoeff - smallestLc);

  // Leading fraction formula
  const fraction = 1 - (lcDiff / √smallestLc)^(2/3);

  return Math.max(0, fraction) * availablePoints;
}
```

**Source**: GAP.cs lines 967-993

### Arrival Points

Position-based rewards for finishing order.

```typescript
function calcArrivalPoints(
  position: number,
  totalFinishers: number,
  availablePoints: number
): number {
  if (totalFinishers <= 1) return availablePoints;

  // Position ratio (1st = 1.0, last = 1/n)
  const positionRatio = (totalFinishers - position + 1) / totalFinishers;

  // Apply curve
  const fraction = positionRatio^0.667;

  return fraction * availablePoints;
}
```

**Source**: GAP.cs lines 700-780

---

## Leading Coefficient

The leading coefficient measures how much a pilot led the race, calculated as the area under the time-distance curve.

### Classic LC

Simple area under curve:

```typescript
function calcClassicLC(graph: TimeDist[]): number {
  let area = 0;

  for (let i = 1; i < graph.length; i++) {
    const dt = graph[i].time - graph[i-1].time;
    const avgDist2es = (graph[i-1].dist2es + graph[i].dist2es) / 2;
    area += dt * avgDist2es;
  }

  return area;
}
```

### PWC 2019 LC

Squared distance weighting:

```typescript
function calcPwc2019LC(graph: TimeDist[], ssDistance: number): number {
  let area = 0;

  for (let i = 1; i < graph.length; i++) {
    const dt = graph[i].time - graph[i-1].time;

    // Squared weighting
    const prevWeight = (graph[i-1].dist2es / ssDistance)²;
    const currWeight = (graph[i].dist2es / ssDistance)²;
    const avgWeight = (prevWeight + currWeight) / 2;

    area += dt * avgWeight;
  }

  return area;
}
```

### PWC 2023 LC

Altitude compensation added:

```typescript
function calcPwc2023LC(
  graph: TimeDist[],
  ssDistance: number,
  essAltitude: number,
  altitudeFactor: number
): number {
  let area = 0;

  for (let i = 1; i < graph.length; i++) {
    const dt = graph[i].time - graph[i-1].time;

    // Distance weighting
    const prevDistWeight = (graph[i-1].dist2es / ssDistance)²;
    const currDistWeight = (graph[i].dist2es / ssDistance)²;

    // Altitude bonus (per 1000m above ESS)
    const prevAltBonus = (graph[i-1].alt - essAltitude) / 1000 * altitudeFactor;
    const currAltBonus = (graph[i].alt - essAltitude) / 1000 * altitudeFactor;

    // Combined weight
    const prevWeight = prevDistWeight * (1 + prevAltBonus);
    const currWeight = currDistWeight * (1 + currAltBonus);
    const avgWeight = (prevWeight + currWeight) / 2;

    area += dt * avgWeight;
  }

  return area;
}
```

**Source**: FsSfGAP/LeadingCalculator/*.cs

---

## Stopped Task Calculations

### Bonus Distance

For stopped tasks, pilots receive bonus distance based on altitude at stop time.

```typescript
function calcBonusDistance(
  altitudeAtStop: number,
  essAltitude: number,
  glideRatio: number = 4.0  // Conservative estimate
): number {
  const altitudeAdvantage = Math.max(0, altitudeAtStop - essAltitude);
  return altitudeAdvantage * glideRatio;
}
```

### Stopped Task Distance

```typescript
totalDistance = distanceFlown + bonusDistance
```

---

## FTV (Fixed Total Validity)

Allows discarding a portion of worst results.

```typescript
function applyFTV(
  taskResults: { points: number; maxPoints: number }[],
  ftvFactor: number  // e.g., 0.25 = discard 25%
): number {
  const totalMaxPoints = sum(taskResults.map(r => r.maxPoints));
  const targetPoints = totalMaxPoints * (1 - ftvFactor);

  // Sort by normalized score (points/maxPoints) descending
  const sorted = taskResults.sort((a, b) =>
    (b.points / b.maxPoints) - (a.points / a.maxPoints)
  );

  let accumulated = 0;
  let accumulatedMax = 0;

  for (const result of sorted) {
    if (accumulatedMax >= targetPoints) {
      // Discard this task
      continue;
    }

    const remaining = targetPoints - accumulatedMax;
    const contribution = Math.min(result.maxPoints, remaining);
    const fraction = contribution / result.maxPoints;

    accumulated += result.points * fraction;
    accumulatedMax += contribution;
  }

  return accumulated;
}
```

---

## Penalty Formulas

### Jump The Gun

Pilot starts before gate opens.

```typescript
function calcJumpTheGunPenalty(
  secondsEarly: number,
  penaltyPerSecond: number = 2  // points per second
): number {
  return secondsEarly * penaltyPerSecond;
}
```

### Percentage Penalty

Applied as percentage of total points.

```typescript
function applyPercentagePenalty(
  totalPoints: number,
  penaltyPercent: number
): number {
  return totalPoints * (1 - penaltyPercent / 100);
}
```

---

## Constants

### Default Formula Values

| Parameter | Value | Description |
|-----------|-------|-------------|
| Nominal Distance | 50,000 m | Expected minimum task distance |
| Nominal Time | 5,400 s | Expected minimum winning time (90 min) |
| Nominal Goal | 0.20 | Expected goal percentage (20%) |
| Nominal Launch | 0.96 | Expected launch percentage (96%) |
| Minimum Distance | 7,000 m | Distance floor for scoring |
| Leading Fraction | 0.26 | Portion of time points for leading (26%) |

### Earth Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Earth Radius (WGS84) | 6,371,000 m | Mean radius |
| Earth Radius (FAI) | 6,371,000 m | FAI sphere radius |
| Degrees to Radians | π/180 | Conversion factor |

---

## Polynomial Coefficients

### Time Validity Polynomial

```
TV = -0.271 + 2.912x - 2.098x² + 0.457x³
```

where x = min(bestTime/nomTime, 1) or min(bestDist/nomDist, 1)

### Launch Validity Polynomial

```
LV = 0.028x + 2.917x² - 1.944x³
```

where x = min(pilotsFlying / (pilotsPresent × nomLaunch), 1)
