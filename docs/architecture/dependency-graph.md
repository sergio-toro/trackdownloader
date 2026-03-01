# Dependency Graph

This document visualizes the module dependencies for the competition classification system.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Electron Main Process"
        IGC[IGC Parser]
        SCORING[Scoring Engine]
        STORAGE[Competition Storage]
        IPC[IPC Handlers]
    end

    subgraph "Electron Renderer Process"
        CTX[Competition Context]
        COMP[Competition Components]
        HOOKS[Custom Hooks]
    end

    subgraph "External"
        FILES[File System]
        XCTSK[.xctsk Files]
        IGCF[.igc Files]
    end

    XCTSK --> IPC
    IGCF --> IPC
    IPC --> IGC
    IPC --> SCORING
    IPC --> STORAGE
    STORAGE --> FILES
    IPC <--> CTX
    CTX --> COMP
    CTX --> HOOKS
```

## Detailed Module Dependencies

### Phase 1: Foundation

```mermaid
graph TD
    subgraph "Types Module"
        T1[competition.ts]
        T2[task.ts]
        T3[participant.ts]
        T4[results.ts]
        T5[formula.ts]
        T6[index.ts]
    end

    T1 --> T6
    T2 --> T6
    T3 --> T6
    T4 --> T6
    T5 --> T6

    subgraph "Storage Module"
        S1[competitionStorage.ts]
        S2[fileStorage.ts]
    end

    T6 --> S1
    S1 --> S2

    subgraph "IPC Module"
        I1[registerScoringIpc.ts]
        I2[scoringPreload.ts]
    end

    S1 --> I1
    T6 --> I2

    subgraph "Renderer Context"
        C1[competitionContext.tsx]
    end

    T6 --> C1
    I2 --> C1
```

### Phase 2: Task Import

```mermaid
graph TD
    subgraph "Import Module"
        IM1[xctaskImporter.ts]
    end

    subgraph "Geo Module"
        G1[distance.ts]
        G2[shortestRoute.ts]
    end

    G1 --> G2
    G2 --> IM1

    subgraph "UI Components"
        U1[ImportXctskDialog.tsx]
        U2[TaskDefinition.tsx]
        U3[WaypointTable.tsx]
    end

    IM1 --> U1
    U1 --> U2
    U2 --> U3
```

### Phase 3: Flight Analysis

```mermaid
graph TD
    subgraph "Analysis Module"
        A1[flightAnalyzer.ts]
        A2[turnpointDetector.ts]
        A3[distanceCalculator.ts]
        A4[timeDistanceGraph.ts]
    end

    subgraph "Geo Module"
        G3[cylinderCrossing.ts]
    end

    subgraph "Existing"
        E1[igc-parser.ts]
    end

    E1 --> A1
    G3 --> A2
    A2 --> A1
    A3 --> A1
    A4 --> A1
```

### Phase 4: Scoring Engine

```mermaid
graph TD
    subgraph "Core Module"
        C1[validity.ts]
        C2[weights.ts]
        C3[dayQuality.ts]
    end

    C1 --> C3
    C2 --> C3

    subgraph "Points Module"
        P1[distancePoints.ts]
        P2[timePoints.ts]
        P3[arrivalPoints.ts]
        P4[leadingPoints.ts]
    end

    subgraph "Leading Module"
        L1[leadingCalculator.ts]
        L2[classicCalculator.ts]
        L3[pwc2019Calculator.ts]
        L4[pwc2023Calculator.ts]
    end

    L1 --> L2
    L1 --> L3
    L1 --> L4
    L1 --> P4

    subgraph "Scoring Module"
        S1[taskScorer.ts]
    end

    C3 --> S1
    P1 --> S1
    P2 --> S1
    P3 --> S1
    P4 --> S1

    subgraph "Formulas Module"
        F1[baseFormula.ts]
        F2[gap2023.ts]
        F3[gap2025.ts]
    end

    F1 --> F2
    F1 --> F3
    F2 --> S1
    F3 --> S1
```

### Phase 5: Results & UI

```mermaid
graph TD
    subgraph "Routes"
        R1[Competition.tsx]
    end

    subgraph "Competition Components"
        CC1[CompetitionHeader.tsx]
        CC2[CompetitionSettings.tsx]
        CC3[ScoringFormulaForm.tsx]
    end

    subgraph "Participant Components"
        PC1[ParticipantTable.tsx]
        PC2[ParticipantTrackLinker.tsx]
    end

    subgraph "Results Components"
        RC1[TaskResultsTable.tsx]
        RC2[PointsBreakdown.tsx]
        RC3[CompetitionStandings.tsx]
        RC4[ExportDialog.tsx]
    end

    R1 --> CC1
    R1 --> CC2
    CC2 --> CC3
    R1 --> PC1
    PC1 --> PC2
    R1 --> RC1
    RC1 --> RC2
    R1 --> RC3
    RC1 --> RC4
    RC3 --> RC4
```

## Cross-Phase Dependencies

```mermaid
graph LR
    subgraph "Phase 1"
        P1A[Types]
        P1B[Storage]
        P1C[IPC]
        P1D[Context]
    end

    subgraph "Phase 2"
        P2A[XCTrack Parser]
        P2B[Geo Utils]
        P2C[Task UI]
    end

    subgraph "Phase 3"
        P3A[Flight Analyzer]
        P3B[TP Detector]
        P3C[Distance Calc]
    end

    subgraph "Phase 4"
        P4A[Validity]
        P4B[Weights]
        P4C[Points]
        P4D[Leading]
        P4E[Scorer]
    end

    subgraph "Phase 5"
        P5A[Results UI]
        P5B[Export]
    end

    P1A --> P2A
    P1B --> P2A
    P1C --> P2C
    P1D --> P2C

    P2B --> P3B
    P2A --> P3A

    P3A --> P4E
    P3C --> P4C

    P4E --> P5A
    P5A --> P5B
```

## File System Structure

```
src/main/scoring/
├── types/
│   ├── index.ts              # Re-exports all types
│   ├── competition.ts        # Core enums (TaskType, TaskStatus, etc.)
│   ├── task.ts               # Task, Turnpoint, StartGate
│   ├── participant.ts        # Participant, TaskParticipant
│   ├── results.ts            # TaskResult, CompetitionResult
│   └── formula.ts            # ScoringFormulaConfig, defaults
│
├── storage/
│   ├── competitionStorage.ts # Storage interface
│   └── fileStorage.ts        # File-based implementation
│
├── import/
│   └── xctaskImporter.ts     # XCTrack .xctsk parser
│
├── geo/
│   ├── distance.ts           # Haversine, WGS84 Andoyer
│   ├── shortestRoute.ts      # Route optimization
│   └── cylinderCrossing.ts   # Cylinder intersection
│
├── analysis/
│   ├── flightAnalyzer.ts     # Main flight analysis
│   ├── turnpointDetector.ts  # TP crossing detection
│   ├── distanceCalculator.ts # Distance calculations
│   └── timeDistanceGraph.ts  # Time-dist graph for LC
│
├── formulas/
│   ├── index.ts              # Formula registry
│   ├── baseFormula.ts        # Shared logic
│   ├── gap2023.ts            # GAP2023 specifics
│   └── gap2025.ts            # GAP2025 specifics
│
├── core/
│   ├── validity.ts           # TV, LV, DV, SV
│   ├── weights.ts            # Weight distribution
│   └── dayQuality.ts         # Day quality calculation
│
├── points/
│   ├── distancePoints.ts     # Distance scoring
│   ├── timePoints.ts         # Time scoring
│   ├── arrivalPoints.ts      # Arrival scoring
│   └── leadingPoints.ts      # Leading/departure scoring
│
├── leading/
│   ├── leadingCalculator.ts  # Base interface
│   ├── classicCalculator.ts  # Classic LC
│   ├── pwc2019Calculator.ts  # PWC 2019 LC
│   └── pwc2023Calculator.ts  # PWC 2023 LC
│
├── scoring/
│   └── taskScorer.ts         # Main scoring orchestrator
│
└── ipc/
    ├── registerScoringIpc.ts # IPC handlers
    └── scoringPreload.ts     # Preload bridge
```

## Integration Points

### With Existing Trackdownloader Code

| New Module | Integrates With | Purpose |
|------------|-----------------|---------|
| `competitionContext.tsx` | `settingsContext.tsx` | Access pilot data |
| `flightAnalyzer.ts` | `igc-parser.ts` | Parse IGC files |
| `registerScoringIpc.ts` | `registerTracksIpc.ts` | Follow IPC pattern |
| `scoringPreload.ts` | `tracksPreload.ts` | Follow preload pattern |
| Competition route | `Home.tsx` | Navigation integration |

### With FS Codebase

| New Module | FS Source File | Lines |
|------------|----------------|-------|
| `validity.ts` | `GAP.cs` | 187-267 |
| `weights.ts` | `GAP.cs` | 508-594 |
| `distancePoints.ts` | `GAP.cs` | 1074-1103, 1237-1257 |
| `timePoints.ts` | `GAP.cs` | 1159-1173 |
| `leadingPoints.ts` | `GAP.cs` | 967-993 |
| `turnpointDetector.ts` | `Flight.cs` | 423-650 |
| `distanceCalculator.ts` | `Flight.cs` | 910-1122 |
| `pwc2023Calculator.ts` | `LeadingCalculatorPwc2023.cs` | All |
