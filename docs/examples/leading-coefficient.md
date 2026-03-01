# Leading Coefficient Examples

Detailed examples of leading coefficient calculation using different algorithms.

## Overview

The leading coefficient (LC) measures how much a pilot "led the race" - flying ahead of others while progressing toward goal. Lower LC = more leading = more points.

## Sample Time-Distance Graph

Consider a pilot flying a 45km speed section:

```typescript
const timeDistGraph: TimeDist[] = [
  { time: 0,    dist: 0,     dist2es: 45000, alt: 1500 },  // SS start
  { time: 600,  dist: 8000,  dist2es: 37000, alt: 1800 },  // 10 min
  { time: 1200, dist: 15000, dist2es: 30000, alt: 2100 },  // 20 min
  { time: 1800, dist: 22000, dist2es: 23000, alt: 2000 },  // 30 min
  { time: 2400, dist: 28000, dist2es: 17000, alt: 1900 },  // 40 min
  { time: 3000, dist: 34000, dist2es: 11000, alt: 1700 },  // 50 min
  { time: 3600, dist: 40000, dist2es: 5000,  alt: 1500 },  // 60 min
  { time: 4200, dist: 45000, dist2es: 0,     alt: 1400 },  // 70 min - ESS
];
```

---

## Classic LC Calculation

The simplest method: area under the time-distance curve.

### Formula

```
LC = Σ (dt × avgDist2es)
```

### Calculation

```typescript
function calculateClassicLC(graph: TimeDist[]): number {
  let area = 0;

  for (let i = 1; i < graph.length; i++) {
    const dt = graph[i].time - graph[i-1].time;  // seconds
    const avgDist2es = (graph[i-1].dist2es + graph[i].dist2es) / 2;
    area += dt * avgDist2es;
  }

  return area;
}
```

### Step-by-Step

| Interval | dt (s) | avgDist2es (m) | Contribution |
|----------|--------|----------------|--------------|
| 0→1 | 600 | (45000+37000)/2 = 41000 | 24,600,000 |
| 1→2 | 600 | (37000+30000)/2 = 33500 | 20,100,000 |
| 2→3 | 600 | (30000+23000)/2 = 26500 | 15,900,000 |
| 3→4 | 600 | (23000+17000)/2 = 20000 | 12,000,000 |
| 4→5 | 600 | (17000+11000)/2 = 14000 | 8,400,000 |
| 5→6 | 600 | (11000+5000)/2 = 8000 | 4,800,000 |
| 6→7 | 600 | (5000+0)/2 = 2500 | 1,500,000 |

**Total Classic LC = 87,300,000 m·s**

---

## PWC 2019 LC Calculation

Adds squared distance weighting to emphasize leading early in the task.

### Formula

```
LC = Σ (dt × (dist2es / ssDistance)²)
```

### Calculation

```typescript
function calculatePwc2019LC(graph: TimeDist[], ssDistance: number): number {
  let area = 0;

  for (let i = 1; i < graph.length; i++) {
    const dt = graph[i].time - graph[i-1].time;

    const prevWeight = Math.pow(graph[i-1].dist2es / ssDistance, 2);
    const currWeight = Math.pow(graph[i].dist2es / ssDistance, 2);
    const avgWeight = (prevWeight + currWeight) / 2;

    area += dt * avgWeight;
  }

  return area;
}
```

### Step-by-Step

ssDistance = 45000m

| Interval | dt (s) | prevWeight | currWeight | avgWeight | Contribution |
|----------|--------|------------|------------|-----------|--------------|
| 0→1 | 600 | (45/45)² = 1.000 | (37/45)² = 0.676 | 0.838 | 502.8 |
| 1→2 | 600 | 0.676 | (30/45)² = 0.444 | 0.560 | 336.0 |
| 2→3 | 600 | 0.444 | (23/45)² = 0.261 | 0.353 | 211.8 |
| 3→4 | 600 | 0.261 | (17/45)² = 0.143 | 0.202 | 121.2 |
| 4→5 | 600 | 0.143 | (11/45)² = 0.060 | 0.102 | 61.2 |
| 5→6 | 600 | 0.060 | (5/45)² = 0.012 | 0.036 | 21.6 |
| 6→7 | 600 | 0.012 | 0² = 0.000 | 0.006 | 3.6 |

**Total PWC2019 LC = 1,258.2**

---

## PWC 2023 LC Calculation

Adds altitude compensation on top of PWC2019.

### Formula

```
LC = Σ (dt × (dist2es / ssDistance)² × (1 + altBonus))
```

where:
```
altBonus = (altitude - essAltitude) / 1000 × altitudeFactor
```

### Calculation

```typescript
function calculatePwc2023LC(
  graph: TimeDist[],
  ssDistance: number,
  essAltitude: number,
  altFactor: number = 0.05
): number {
  let area = 0;

  for (let i = 1; i < graph.length; i++) {
    const dt = graph[i].time - graph[i-1].time;

    const prevDistWeight = Math.pow(graph[i-1].dist2es / ssDistance, 2);
    const currDistWeight = Math.pow(graph[i].dist2es / ssDistance, 2);

    const prevAltBonus = (graph[i-1].alt - essAltitude) / 1000 * altFactor;
    const currAltBonus = (graph[i].alt - essAltitude) / 1000 * altFactor;

    const prevWeight = prevDistWeight * (1 + prevAltBonus);
    const currWeight = currDistWeight * (1 + currAltBonus);
    const avgWeight = (prevWeight + currWeight) / 2;

    area += dt * avgWeight;
  }

  return area;
}
```

### Step-by-Step

essAltitude = 1400m, altFactor = 0.05

| Interval | distWeight | altBonus (prev→curr) | Combined Weight | Contribution |
|----------|------------|----------------------|-----------------|--------------|
| 0→1 | 0.838 | (0.5%→2.0%) | 0.838×1.005→0.676×1.02 = 0.858 | 514.8 |
| 1→2 | 0.560 | (2.0%→3.5%) | 0.676×1.02→0.444×1.035 = 0.578 | 346.8 |
| 2→3 | 0.353 | (3.5%→3.0%) | 0.444×1.035→0.261×1.03 = 0.365 | 219.0 |
| 3→4 | 0.202 | (3.0%→2.5%) | 0.261×1.03→0.143×1.025 = 0.208 | 124.8 |
| 4→5 | 0.102 | (2.5%→1.5%) | 0.143×1.025→0.060×1.015 = 0.104 | 62.4 |
| 5→6 | 0.036 | (1.5%→0.5%) | 0.060×1.015→0.012×1.005 = 0.037 | 22.2 |
| 6→7 | 0.006 | (0.5%→0.0%) | 0.012×1.005→0×1.0 = 0.006 | 3.6 |

**Total PWC2023 LC = 1,293.6**

---

## Comparing Two Pilots

### Pilot A: Fast but Conservative

```typescript
const pilotA: TimeDist[] = [
  { time: 0,    dist: 0,     dist2es: 45000, alt: 1500 },
  { time: 1800, dist: 20000, dist2es: 25000, alt: 1800 },  // Slow start
  { time: 3000, dist: 35000, dist2es: 10000, alt: 1600 },  // Speeds up
  { time: 3600, dist: 45000, dist2es: 0,     alt: 1400 },  // ESS in 60 min
];
```

### Pilot B: Early Leader

```typescript
const pilotB: TimeDist[] = [
  { time: 0,    dist: 0,     dist2es: 45000, alt: 1500 },
  { time: 1200, dist: 25000, dist2es: 20000, alt: 2000 },  // Fast start!
  { time: 2400, dist: 38000, dist2es: 7000,  alt: 1700 },
  { time: 3600, dist: 45000, dist2es: 0,     alt: 1400 },  // Same finish
];
```

### PWC2023 LC Comparison

**Pilot A:**
- Spends more time with high dist2es
- Lower altitude advantage early
- LC = ~1,450

**Pilot B:**
- Quickly reduces dist2es
- Higher altitude advantage early
- LC = ~980

**Result**: Pilot B has lower LC (better leading), gets more leading points despite same finish time.

---

## Normalization

### Task LC Minimum

All pilot LCs are normalized by the best LC in the task:

```typescript
function normalizeLC(pilotLC: number, bestLC: number): number {
  return pilotLC / bestLC;
}
```

Example:
- Pilot A: 1,450 / 980 = 1.48 (normalized)
- Pilot B: 980 / 980 = 1.00 (normalized)

### Leading Points Calculation

```typescript
function calcLeadingPoints(
  normalizedLC: number,
  smallestNormalizedLC: number,
  availablePoints: number
): number {
  const lcDiff = normalizedLC - smallestNormalizedLC;
  const fraction = 1 - Math.pow(lcDiff / Math.sqrt(smallestNormalizedLC), 2/3);
  return Math.max(0, fraction) * availablePoints;
}
```

With 60 available leading points:
- Pilot B: fraction = 1.0 → 60 points
- Pilot A: fraction = 1 - (0.48/1)^0.667 = 1 - 0.61 = 0.39 → 23.4 points

---

## Key Insights

1. **Early Leading Matters**: PWC2019/2023 squared weighting heavily rewards leading when far from ESS

2. **Altitude Helps**: PWC2023's altitude bonus rewards pilots flying higher (more potential energy)

3. **Time Efficiency**: Spending less time at each distance-to-ESS reduces LC

4. **Normalization**: All pilots compared relative to the best LC, not absolute values

5. **Point Distribution**: Leading points follow a power law - small LC differences early in the ranking matter more
