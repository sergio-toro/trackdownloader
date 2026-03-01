# Validation Notes

Guide for validating the TypeScript scoring implementation against FS.

## Test Data Source

The test data comes from the **Swiss Paragliding Championship 2012**, Task 1, held in Disentis, Switzerland on July 24, 2012.

**Source Files:**
- Original FS database: `/Users/sergio/storo/FS/GrayboxTest/resources/Test_001/FsDb.xml`
- IGC files: `/Users/sergio/storo/FS/GrayboxTest/resources/Test_001/Task_001/`

## Test Data Contents

### Task File

`swiss-pgchamp-2012-task1.xctsk` - XCTrack format task definition

| Parameter | Value |
|-----------|-------|
| Task Distance | 80.874 km |
| Speed Section | 77.326 km |
| Turnpoints | 8 (Takeoff, SSS, 4 TPs, ESS, Goal) |
| Goal Type | LINE |
| Start Gate | 12:20:00 UTC+2 |

### IGC Files

| File | Pilot | Result | Distance | Time | Points |
|------|-------|--------|----------|------|--------|
| `pilot-001-goal.igc` | Dominik Frei | Goal (Winner) | 80.874 km | 2:23:44 | 993 |
| `pilot-002-landed-short.igc` | Nanda Walliser | Landed Short | 57.08 km | - | 339 |
| `pilot-003-dnf.igc` | Gieri Murk | DNF | 3.3 km (min 5km) | - | 37 |

### Expected Results

`expected-results.json` contains:
- Complete task statistics
- Validity calculations (all 1.0 for this task)
- Weight distribution
- Available points per category
- Detailed pilot results with point breakdowns

---

## Competition Statistics

```
Pilots Present:     65
Pilots Flying:      65
Pilots in Goal:     27 (41.5%)
Pilots at ESS:      27
Best Distance:      80.874 km
Best Time:          2h 23m 44s
Day Quality:        1.0 (100%)
```

### Validity Values (from FS)

```
Time Validity:      1.0
Launch Validity:    1.0
Distance Validity:  1.0
Day Quality:        1.0
```

### Available Points

```
Total:              1000.0
Distance:           461.88
Time:               443.95
Leading:             94.17
```

---

## Formula Configuration

The competition used **PWC2011** formula:

| Parameter | Value |
|-----------|-------|
| Minimum Distance | 5 km |
| Nominal Distance | 60 km |
| Nominal Time | 1.5 hours (90 min) |
| Nominal Goal | 30% |
| Leading Points | Yes |
| Arrival Points | No |
| Departure Points | No |

**Note:** PWC2011 is a predecessor to GAP2023. The core formulas are similar, but some parameters differ. When validating GAP2023/GAP2025 implementations, adjust the formula parameters accordingly.

---

## Validation Strategy

### 1. Unit Test Each Formula Component

```typescript
describe('Validity Calculations', () => {
  it('calcTimeValidity should return 1.0 for this task', () => {
    const result = calcTimeValidity(stats, formula);
    expect(result).toBeCloseTo(1.0, 3);
  });
});
```

### 2. Integration Test Full Scoring

```typescript
describe('Full Task Scoring', () => {
  it('should match FS results for pilot-001-goal', async () => {
    const analysis = await analyzeFlightForTask(
      'test-data/sample-igc/pilot-001-goal.igc',
      task,
      40534
    );
    const result = await scorePilot(analysis, stats, available, formula);

    expect(result.distancePoints).toBeCloseTo(461.9, 1);
    expect(result.timePoints).toBeCloseTo(443.9, 1);
    expect(result.leadingPoints).toBeCloseTo(87.0, 1);
    expect(result.totalPoints).toBe(993);
    expect(result.rank).toBe(1);
  });
});
```

### 3. Cross-Validate with FS Output

Run the same task/IGCs through FS and compare:
1. Parse the .xctsk file
2. Analyze each IGC file
3. Calculate statistics
4. Score each pilot
5. Compare point-by-point

---

## Tolerance Guidelines

| Metric | Tolerance | Notes |
|--------|-----------|-------|
| Validity values | ±0.001 | 3 decimal places |
| Day quality | ±0.001 | Product of validities |
| Distance points | ±0.1 | 1 decimal place |
| Time points | ±0.1 | 1 decimal place |
| Leading points | ±0.5 | More variance expected |
| Total points | ±1.0 | Integer when displayed |
| Rankings | Exact | Must match exactly |

---

## Known Differences from FS

### 1. Coordinate Systems

FS stores turnpoints in UTM format. The .xctsk file uses WGS84 decimal degrees. Coordinate conversion may introduce minor discrepancies (<10m).

### 2. Leading Coefficient

The leading coefficient calculation in PWC2011 differs slightly from GAP2023/PWC2023:
- PWC2011 uses a simpler area calculation
- GAP2023+ uses squared distance weighting
- Expect ~5-10% variance in leading points

### 3. Time Handling

FS stores times with +02:00 timezone offset. Ensure proper timezone handling:
```typescript
// Correct: Parse with timezone
const startTime = new Date('2012-07-24T12:20:00+02:00');

// Incorrect: Ignore timezone
const startTime = new Date('2012-07-24T12:20:00'); // Assumes local
```

---

## IGC File Notes

### pilot-001-goal.igc (Dominik Frei)

- **Outcome:** Goal finisher, winner
- **Key times:**
  - Started SS: 12:20:12
  - Finished SS: 14:43:44
  - Finished Task: 14:45:42
- **Distance:** 80.874 km (full task)
- **Leading Coefficient:** 1.603 (near best)

### pilot-002-landed-short.igc (Nanda Walliser)

- **Outcome:** Landed short, no goal
- **Key times:**
  - Started SS: 12:24:27
  - Last point: 15:09:23
- **Distance:** 57.08 km
- **Notes:** Received 0.9 leading points (started SS)

### pilot-003-dnf.igc (Gieri Murk)

- **Outcome:** DNF, minimum distance applied
- **Key times:**
  - Started SS: 12:51:01
  - Finished Task: 12:55:31 (very short flight)
- **Distance:** 3.304 km actual, 5.0 km scored
- **Notes:** Below minimum, scored at floor distance

---

## Running Validation Tests

### Setup

```bash
cd /Users/sergio/storo/trackdownloader
npm install
```

### Run Tests

```bash
npm test -- --grep "scoring"
```

### Manual Validation

```typescript
import { parseXctskFile } from './scoring/import/xctaskImporter';
import { analyzeFlightForTask } from './scoring/analysis/flightAnalyzer';
import { scoreTask } from './scoring/scoring/taskScorer';

// Load test data
const task = await parseXctskFile('docs/test-data/swiss-pgchamp-2012-task1.xctsk');
const igcPath = 'docs/test-data/sample-igc/pilot-001-goal.igc';

// Analyze and score
const analysis = await analyzeFlightForTask(igcPath, task, 40534);
const result = await scoreTask({ task, analyses: [analysis], formula: PWC2011 });

// Compare with expected-results.json
console.log(result);
```

---

## Additional Test Data

The FS GrayboxTest folder contains 199 IGC files across 3 tasks:

```
/Users/sergio/storo/FS/GrayboxTest/resources/Test_001/
├── FsDb.xml                    # Full competition database
├── FsDb-recalculated.xml       # Recalculated results
├── Task_001/                   # 65 IGC files (July 24)
├── Task_002/                   # 66 IGC files (July 26)
└── Task_003/                   # 68 IGC files (July 27)
```

For comprehensive validation, process all 199 flights and compare against the FS database.

---

## Troubleshooting

### Points Don't Match

1. **Check day quality calculation** - This affects all points proportionally
2. **Verify weight distribution** - Small errors compound
3. **Check leading coefficient** - Most variance-prone component
4. **Verify distance calculation** - Affects both distance and leading points

### Rankings Don't Match

1. **Check tie-breaking rules** - FS may use different criteria
2. **Verify all pilots processed** - Missing pilots shift rankings
3. **Check penalty application** - May affect ordering

### Time Points Wrong

1. **Verify start gate time** - Must match task definition
2. **Check SS crossing detection** - Interpolation matters
3. **Verify time fraction formula** - Exponent differs between formulas
