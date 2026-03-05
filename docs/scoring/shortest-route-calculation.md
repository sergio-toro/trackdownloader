# Shortest Route Calculation

How the task distance is computed by finding the shortest legal path through turnpoint cylinders.

## Overview

Task distance in paragliding/hang-gliding scoring is the length of the **shortest route** through all turnpoint cylinders. This is NOT the sum of center-to-center distances — the route is optimized to find the minimum total distance while touching each cylinder boundary.

The algorithm is implemented in `src/main/scoring/geo/shortestRoute.ts`.

---

## 1. Algorithm Steps

### 1.1 Input
- Array of turnpoints with center coordinates, radii, and types
- Speed section indices (SS start and ES end)

### 1.2 Process

1. **Initialize** route with turnpoint center coordinates
2. **Optimize** route iteratively (up to 100 iterations):
   - For each intermediate turnpoint (skip first and last):
     - Find optimal point on cylinder boundary between previous and next route points
     - Update route point if position changed
   - Track maximum change across all points
   - Stop if max change < 0.1m (convergence tolerance)
3. **Calculate** leg distances using WGS84 Andoyer distance formula
4. **Sum** for total task distance, speed section distance, launch-to-ESS distance

### 1.3 Output

```typescript
interface TaskDistances {
  shortestRoute: GeoPoint[];       // Optimized waypoints on cylinder edges
  legDistances: number[];           // Distance for each leg (meters)
  taskDistance: number;             // Total (rounded to meters)
  speedSectionDistance: number;     // SS to ES legs sum
  launchToEssDistance: number;      // Launch to ESS legs sum
}
```

---

## 2. Optimal Cylinder Point

The core geometric problem: find point P on cylinder boundary that minimizes `distance(prev, P) + distance(P, next)`.

### 2.1 Local Planar Projection

The algorithm projects to a local coordinate system centered on the turnpoint:

```
cosLat = cos(center.latitude × π/180)
x = (point.longitude - center.longitude) × 111111 × cosLat
y = (point.latitude - center.latitude) × 111111
```

Where 111,111 m/degree is the approximate latitude meter constant.

### 2.2 Case Analysis

**Case A: Line intersects cylinder** (`distToLine <= radius`)
- Solve quadratic formula for line-circle intersections
- Choose intersection minimizing total path distance
- Extended range `t ∈ [-0.5, 1.5]` catches boundary touches

**Case B: Line misses cylinder** (`distToLine > radius`)
- Use golden section search to find optimal angle on circle
- Cost function: `f(θ) = d(prev, P(θ)) + d(P(θ), next)`
- Search range: ±90° around estimated optimal angle
- Convergence tolerance: 1e-8 radians (~30-40 iterations)

### 2.3 Back to Geographic

```
latitude = center.lat + optimalY / 111111
longitude = center.lon + optimalX / (111111 × cosLat)
```

---

## 3. Distance Functions

Three distance algorithms, with **Andoyer as default**:

| Method | Accuracy | Speed | Used For |
|--------|----------|-------|----------|
| **WGS84 Andoyer** | ~0.01% at <100km | Fast | Default (all scoring) |
| Haversine | ~0.5% (spherical) | Fastest | Simple estimates |
| Vincenty | ~1e-9m (ellipsoid) | Slow (iterative) | High precision |

### WGS84 Andoyer

```
1. Central angle via spherical law of cosines
2. Andoyer correction for Earth's ellipsoid flattening (1/298.257)
3. Result = WGS84_RADIUS_A × (angle + correction)
```

Constants: `WGS84_RADIUS_A = 6,378,137m`, `FAI_SPHERE_RADIUS = 6,371,000m`

---

## 4. Known Limitations

### 4.1 Planar Approximation Error

The route optimization uses a planar (flat-earth) projection for geometric calculations. This introduces error at the scale of competition tasks:

- **Error magnitude**: ~0.046% (30m on a 65km task)
- **Source**: `111,111 m/degree` constant (actual varies by latitude: 110,540 at poles to 111,320 at equator)
- **Impact**: Task distance differs from FS by ~30m, leading to ~0.1 point difference in distance points

### 4.2 Convergence

- Hard iteration limit: 100 (never hit in practice for competition tasks)
- Convergence tolerance: 0.1m
- Typical convergence: 2-5 iterations
- Golden section search: 30-40 iterations with 1e-8 radian tolerance

### 4.3 FS Reference Comparison (Lliga A T05)

| Metric | Our Value | FS Value | Diff |
|--------|-----------|----------|------|
| Task Distance | 65,331 m | 65,361 m | 30 m (0.046%) |
| SS Distance | 63,726 m | 63,761 m | 35 m (0.055%) |
| Launch-ESS | 64,730 m | 64,760 m | 30 m (0.046%) |

---

## 5. Data Flow

```
Task Import (xctskImporter.ts)
  └─ createTaskDefinition()
       └─ calculateTaskDistances()
            ├─ Initialize with turnpoint centers
            ├─ optimizeRoute() iterates to convergence
            └─ Calculate leg distances

Scoring (registerScoringIpc.ts)
  └─ "scoring-score-task" IPC handler
       └─ RECALCULATES distances via calculateTaskDistances()
            └─ Updates task in storage with new values
```

Task distances are **recalculated at scoring time** to ensure consistency with the current algorithm version.

---

## 6. Key Files

| File | Purpose |
|------|---------|
| `geo/shortestRoute.ts` | Main algorithm: `calculateTaskDistances()`, `optimizeRoute()` |
| `geo/distance.ts` | Distance functions: `distanceWgs84Andoyer()`, `distanceHaversine()`, `distanceWgs84Vincenty()` |
| `geo/constants.ts` | WGS84 constants, tolerances |
| `analysis/distanceCalculator.ts` | Flown distance calculation for individual pilots |
| `ipc/registerScoringIpc.ts` | Task distance recalculation during scoring |
