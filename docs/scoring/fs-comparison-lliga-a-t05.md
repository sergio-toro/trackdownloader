# FS Comparison: Lliga Catalana A 2025 — Task 05

Detailed comparison of our scoring engine vs FS (FAI Scoring Software) R3.4 reference results.

**FS Reference**: https://federacioaeria.cat/wp-content/uploads/2025/08/LLIGA-A_T05_Overall_V13_12.html

**Competition**: Lliga Catalana A 2025, Task 05
**Competition ID**: `bade6d81-aed1-47b1-b851-bb48b4d1f371`
**Task ID**: `f5ded936-36ff-4800-bc5f-007a16ca7c63`
**Formula**: GAP2023 (PWC2023 leading calculator)
**Pilots**: 41 flying

---

## 1. Task Parameters

| Parameter | Our Value | FS Value | Diff |
|-----------|-----------|----------|------|
| Task Distance | 65,331 m | 65,361 m | 30 m (0.046%) |
| SS Distance | 63,726 m | 63,761 m | 35 m (0.055%) |
| Launch-ESS Distance | 64,730 m | 64,760 m | 30 m (0.046%) |
| Best Time | 7,349 s (2:02:29) | 7,360 s (2:02:40) | 11 s |
| Pilots Flying | 41 | 41 | 0 |
| Pilots in Goal | 10 | 10 | 0 |
| Day Quality | 1.0000 | 1.0000 | 0 |

### Task Distance Difference (30m)

Caused by planar approximation in our shortest route optimization. We use `111,111 m/degree` for the local coordinate projection, which varies from ~110,540 m/deg at poles to ~111,320 m/deg at the equator. This introduces ~0.046% error on a 65km task.

**Impact**: Affects distance points for landed-out pilots by ~0.1 points. Negligible for goal pilots (all get full task distance).

### Best Time Difference (11s)

Caused by different SS/ES crossing detection. FS uses different interpolation or tolerance band handling when determining the exact crossing timestamp.

---

## 2. Available Points

| Category | Our Value | FS Value | Diff |
|----------|-----------|----------|------|
| Distance Available | 587.3 | 587.3 | 0 |
| Time Available | 305.4 | 305.4 | 0 |
| Leading Available | 107.3 | 107.3 | 0 |
| **Total Available** | **1000.0** | **1000.0** | **0** |

Weight distribution matches exactly. Goal ratio = 10/41 = 0.2439.

---

## 3. Goal Pilot Comparison (Ranks 1-10)

All 10 goal pilots compared. Total score differences are 0.0–3.5 points.

| Rank | Pilot | FS Total | Our Total | Diff | FS DP | Our DP | FS TP | Our TP | FS LP | Our LP |
|------|-------|----------|-----------|------|-------|--------|-------|--------|-------|--------|
| 1 | Sergi Claret | 1000.0 | 1000.0 | 0.0 | 587.3 | 587.3 | 305.4 | 305.4 | 107.3 | 107.3 |
| 2 | David Villarta | 929.6 | 928.4 | -1.2 | 587.3 | 587.3 | 256.5 | 256.7 | 85.8 | 84.3 |
| 3 | Rafael Rosa | 883.4 | 885.1 | +1.7 | 587.3 | 587.3 | 219.9 | 219.9 | 76.2 | 77.9 |
| 4 | Andreu Moreno | 873.3 | 871.2 | -2.1 | 587.3 | 587.3 | 207.3 | 206.8 | 78.7 | 77.1 |
| 5 | Vicente Gallart | 842.6 | 844.1 | +1.5 | 587.3 | 587.3 | 181.8 | 182.1 | 73.5 | 74.7 |
| 6 | Sergei Prikhodko | 790.2 | 788.7 | -1.5 | 587.3 | 587.3 | 148.3 | 148.4 | 54.6 | 53.0 |
| 7 | Adrià Fabra | 779.0 | 781.7 | +2.7 | 587.3 | 587.3 | 150.2 | 154.5 | 41.5 | 40.0 |
| 8 | Sergio Luz | 763.0 | 762.4 | -0.6 | 587.3 | 587.3 | 128.2 | 129.3 | 47.5 | 45.8 |
| 9 | Manel Gras | 734.5 | 735.9 | +1.4 | 587.3 | 587.3 | 97.3 | 98.1 | 49.9 | 50.6 |
| 10 | Arnau Mercadé | 715.1 | 718.5 | +3.4 | 587.3 | 587.3 | 79.6 | 81.7 | 48.2 | 49.5 |

### Sources of Goal Pilot Differences

**Time Points (0.1–4.3 pt diff)**: SS/ES crossing times differ by 5–87 seconds between implementations, causing different race times. The time points formula `1 - (timeDiff / (60 × √bestTime))^(5/6)` amplifies small time differences.

**Leading Points (0.7–2.7 pt diff)**: LC values differ by ~1–3% from FS, caused by:
- Speed section distance difference (63,726 vs 63,761 m) → different weight denominators
- Slightly different dist2es values from different shortest route
- Different graph resolution or interpolation

**Distance Points**: Identical for all goal pilots (full task distance = max available).

---

## 4. Non-ESS Pilots with Leading Points (Ranks 11-13)

These are pilots who crossed SS but did not reach ESS. They receive distance + leading points.

| Rank | Pilot | FS Total | Our Total | Diff | FS DP | Our DP | FS LP | Our LP |
|------|-------|----------|-----------|------|-------|--------|-------|--------|
| 11 | Albert Clavera | 603.8 | 605.5 | +1.7 | 546.0 | 545.9 | 57.8 | 59.5 |
| 12 | David Polo | 545.7 | 569.8 | +24.1 | 494.2 | 494.2 | 51.5 | 75.7 |
| 13 | Antonio Paparella | 452.6 | 486.2 | +33.6 | 452.3 | 452.2 | 0.3 | 34.1 |

### Analysis

**Clavera (rank 11)**: Close match. Leading points differ by 1.7 (59.5 vs 57.8). The remaining discrepancy (~3%) is consistent with LC computation differences seen in goal pilots.

**Polo (rank 12)**: Significant difference. Our LC (0.000758) is lower (better) than FS expects (~0.000899). Polo flew for 6,712s of the ~11,200s task window, meaning our graph extension adds moderate area at dist2es=10km. FS may apply additional time-ratio normalization or compute dist2es differently.

**Paparella (rank 13)**: Large difference. Our LC (0.001022) is much lower than FS expects (~0.001305). Paparella flew 8,697s but only covered 50km (dist2es=15km). FS gives nearly zero leading points, suggesting Paparella's effective LC is near the 2x cutoff.

### Leading Coefficient Details (Non-ESS Pilots)

| Pilot | Flight Time | Graph End | dist2es | Raw LC | Extended LC | FS Target LC |
|-------|------------|-----------|---------|--------|-------------|-------------|
| Clavera | 8,755 s | 11,180 s | 3,999 m | 0.000845 | 0.000848 | ~0.000859 |
| Polo | 6,712 s | 11,212 s | 10,010 m | 0.000724 | 0.000758 | ~0.000899 |
| Paparella | 8,697 s | 11,223 s | 14,999 m | 0.000979 | 0.001022 | ~0.001305 |
| Stik (rank 14) | 5,598 s | 11,228 s | 20,301 m | 0.000797 | 0.000973 | ≥0.001308 |

The discrepancy increases with lower rankings. This pattern suggests FS applies additional normalization beyond simple graph extension, possibly related to the `useLeadingTimeRatio` feature.

---

## 5. Landed-Out Pilots Without Leading Points (Ranks 14-40)

In FS, all pilots ranked 14+ get zero leading points. Their total = distance points.

| Rank | Pilot | FS Total | Our Total | Diff | Notes |
|------|-------|----------|-----------|------|-------|
| 14 | Gregoire Stik | 400.0 | 440.6 | +40.6 | We give 40.7 LP, FS gives 0 |
| 15 | A. Rodriguez | 363.9 | 366.1 | +2.2 | We give 2.3 LP |
| 16 | Joan Picola | 363.6 | 384.3 | +20.7 | We give 20.8 LP |
| 17 | Josep Ferreiro | 362.2 | 362.0 | -0.2 | LP = 0 both |
| 18 | Jordi Massallé | 359.7 | 389.7 | +30.0 | We give 30.1 LP |
| 22 | Carlos Madrueno | 354.0 | 353.9 | -0.1 | LP = 0 both |
| 36 | G. Monroset | 188.4 | 188.2 | -0.2 | LP = 0 both |
| 40 | X. Segura | 44.9 | 44.9 | 0.0 | Min distance |
| 40 | J. Duran | 44.9 | 44.9 | 0.0 | Min distance |

### Key Issue

Many non-ESS pilots receive excessive leading points in our implementation. In FS, only the top 3 non-ESS pilots (ranks 11-13) receive meaningful leading points. From rank 14 onward, FS gives zero.

Our graph extension approach penalizes short-flying pilots (their graph extends to the task end time with accumulated area), but it's not aggressive enough for pilots who:
- Flew a LONG time but didn't reach far (e.g., Paparella: 8,697s but dist2es=15km)
- Flew moderate time with moderate dist2es (e.g., Massallé: ~6,700s, dist2es=~25km)

These pilots still end up with LC values below the 2× cutoff (where leading fraction = 0), but FS gives them zero.

---

## 6. Ranking Changes

| Rank | FS Pilot | Our Pilot | Match? |
|------|----------|-----------|--------|
| 1-10 | (same) | (same) | ✓ |
| 11 | Clavera | Clavera | ✓ |
| 12 | Polo | Polo | ✓ |
| 13 | Paparella | Paparella | ✓ (inflated LP) |
| 14 | Stik | Stik | ✗ (inflated LP changes rank) |
| 15 | Rodriguez | Massallé | ✗ |
| 16 | Picola | Picola | ✗ |

From rank 14 onward, the ranking order diverges because our excessive leading points reorder pilots. In FS, ranks 14+ are purely ordered by distance.

---

## 7. Root Causes Summary

### 7.1 Task Distance (30m, 0.046%)
- **Source**: Planar approximation in shortest route optimization (111,111 m/deg constant)
- **Impact**: ±0.1 points for landed-out distance, ±0.2% in LC normalization
- **Fix**: Use latitude-dependent degree-to-meter conversion

### 7.2 Crossing Times (5–87s)
- **Source**: Different interpolation in crossing detection, tolerance band handling
- **Impact**: Time points differ by 0.1–4.3 for goal pilots
- **Fix**: Investigate crossing detection algorithm differences

### 7.3 Leading Coefficient (1–30% diff for non-ESS)
- **Source**: `useLeadingTimeRatio` implementation incomplete
- **Impact**: Non-ESS pilots get excessive leading points
- **Current approach**: Graph extension to task end time (partial fix)
- **Remaining gap**: FS appears to apply additional time-based normalization beyond graph extension
- **Evidence**: Pilots who flew shorter fractions of the task window have proportionally larger LC discrepancies

### 7.4 Distance Points (±0.2 for landed-out)
- **Source**: Task distance difference → different `distanceFlown/bestDistance` ratio
- **Impact**: Minimal (< 0.3 points)

---

## 8. What We Tried for Leading Coefficients

### Approach 1: ESS-only leading points (original)
Non-ESS pilots get 0 leading points. Matches FS for rank 14+ but misses ranks 11-13.

### Approach 2: Graph extension only (current)
Extend non-ESS pilots' time-distance graph to task end time (lastESS + scoreBack). Their last dist2es is held constant, accumulating additional LC area.
- **Clavera**: 59.5 LP (FS 57.8) — close ✓
- **Polo**: 75.7 LP (FS 51.5) — too high ✗
- **Rank 14+**: Many get LP when FS gives 0 ✗

### Approach 3: Graph extension + time ratio division
Divide LC by `min(1, pilotTimeInSS / taskTime)` after graph extension.
- **All pilots**: Leading points too low (Clavera 25.5 vs FS 57.8) ✗
- Too aggressive because graph extension already accumulates penalty area

### Approach 4: Time ratio division only (no extension)
Divide raw LC by time ratio without graph extension.
- Similar to approach 3 but even more unbalanced between pilots ✗

### Conclusion
Approach 2 (graph extension) gives the best overall match. The remaining discrepancies (~1.7 pts for Clavera, ~24 pts for Polo) require understanding the exact FS algorithm, which is not publicly documented. The pattern suggests FS uses a combination of techniques that we haven't fully replicated.

---

## 9. Overall Score Accuracy

| Category | Pilots | Max Diff | Avg Diff | Notes |
|----------|--------|----------|----------|-------|
| Goal (rank 1-10) | 10 | 3.5 pts | 1.6 pts | Excellent |
| Non-ESS with LP (11-13) | 3 | 33.6 pts | 19.8 pts | Clavera close, Polo/Paparella high |
| Landed-out, no LP in FS (14+) | 28 | 40.6 pts | ~5 pts | Many get spurious LP |

For pilots that FS gives zero leading points to, our distance points match within ±0.2 points. The discrepancy is entirely in leading points for non-ESS pilots.
