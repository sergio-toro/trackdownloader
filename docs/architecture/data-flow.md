# Data Flow

This document describes how data flows through the competition classification system.

## Overview

```mermaid
flowchart TB
    subgraph "External Input"
        XCTSK[".xctsk Task File"]
        IGCS["IGC Flight Files"]
    end

    subgraph "Main Process"
        subgraph "Import Layer"
            PARSER["XCTrack Parser"]
            IGCP["IGC Parser"]
        end

        subgraph "Analysis Layer"
            FLIGHT["Flight Analyzer"]
            TP["Turnpoint Detector"]
            DIST["Distance Calculator"]
        end

        subgraph "Scoring Layer"
            VALID["Validity Calculator"]
            WEIGHT["Weight Distribution"]
            POINTS["Points Calculator"]
            LC["Leading Coefficient"]
            SCORER["Task Scorer"]
        end

        subgraph "Storage Layer"
            STORE["Competition Storage"]
            FS["File System"]
        end
    end

    subgraph "Renderer Process"
        CTX["Competition Context"]
        UI["React Components"]
    end

    XCTSK --> PARSER
    PARSER --> STORE
    IGCS --> IGCP
    IGCP --> FLIGHT
    FLIGHT --> TP
    FLIGHT --> DIST
    TP --> SCORER
    DIST --> SCORER
    LC --> SCORER
    VALID --> SCORER
    WEIGHT --> SCORER
    POINTS --> SCORER
    SCORER --> STORE
    STORE --> FS
    STORE <--> CTX
    CTX --> UI
```

## Detailed Data Flows

### 1. Competition Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant CTX as CompetitionContext
    participant IPC as IPC Bridge
    participant Store as Storage
    participant FS as File System

    User->>UI: Create new competition
    UI->>CTX: createCompetition(data)
    CTX->>IPC: invoke("scoring:create-competition")
    IPC->>Store: createCompetition(data)
    Store->>FS: Write competition.json
    FS-->>Store: Success
    Store-->>IPC: competitionId
    IPC-->>CTX: competitionId
    CTX-->>UI: Update state
    UI-->>User: Show competition
```

### 2. Task Import Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Import Dialog
    participant IPC as IPC Bridge
    participant Parser as XCTask Parser
    participant Geo as Geo Utils
    participant Store as Storage

    User->>UI: Select .xctsk file
    UI->>IPC: invoke("scoring:import-xctsk", path)
    IPC->>Parser: parseXctskFile(path)
    Parser->>Parser: Parse JSON structure
    Parser->>Geo: Calculate distances
    Geo->>Geo: Shortest route algorithm
    Geo-->>Parser: taskDistance, legDistances
    Parser-->>IPC: TaskDefinition
    IPC-->>UI: Show task preview
    User->>UI: Confirm import
    UI->>IPC: invoke("scoring:add-task", task)
    IPC->>Store: addTask(compId, task)
    Store-->>IPC: Success
    IPC-->>UI: Task added
```

### 3. Flight Analysis Flow

```mermaid
sequenceDiagram
    participant UI as React UI
    participant IPC as IPC Bridge
    participant IGC as IGC Parser
    participant FA as Flight Analyzer
    participant TP as TP Detector
    participant DC as Distance Calc
    participant TDG as Time-Dist Graph

    UI->>IPC: invoke("scoring:analyze-flight", igcPath)
    IPC->>IGC: parse(fileContent)
    IGC-->>FA: IGCFile with fixes
    FA->>TP: findCrossings(fixes, turnpoints)
    TP->>TP: Detect cylinder crossings
    TP-->>FA: crossings[]
    FA->>DC: calculateDistance(fixes, task, crossings)
    DC-->>FA: distanceFlown
    FA->>TDG: generateGraph(fixes, task)
    TDG-->>FA: timeDistGraph[]
    FA-->>IPC: FlightAnalysis
    IPC-->>UI: Display analysis results
```

### 4. Task Scoring Flow

```mermaid
sequenceDiagram
    participant UI as React UI
    participant IPC as IPC Bridge
    participant TS as Task Scorer
    participant V as Validity Calc
    participant W as Weight Calc
    participant P as Points Calc
    participant LC as Leading Calc
    participant Store as Storage

    UI->>IPC: invoke("scoring:score-task", taskId)
    IPC->>TS: scoreTask(task, participants, formula)

    TS->>V: calcTimeValidity(stats)
    V-->>TS: timeValidity
    TS->>V: calcLaunchValidity(stats)
    V-->>TS: launchValidity
    TS->>V: calcDistanceValidity(stats)
    V-->>TS: distanceValidity
    TS->>V: calcDayQuality()
    V-->>TS: dayQuality

    TS->>W: calculateWeights(params)
    W-->>TS: weights{}

    loop For each pilot
        TS->>LC: calculateLC(timeDistGraph)
        LC-->>TS: leadingCoeff
        TS->>P: calcDistancePoints(distance)
        P-->>TS: distancePoints
        TS->>P: calcTimePoints(time)
        P-->>TS: timePoints
        TS->>P: calcLeadingPoints(lc)
        P-->>TS: leadingPoints
        TS->>TS: Sum points, apply penalties
    end

    TS->>TS: Calculate rankings
    TS->>Store: saveTaskResults(results)
    Store-->>TS: Success
    TS-->>IPC: TaskResult[]
    IPC-->>UI: Display results
```

### 5. Competition Results Flow

```mermaid
sequenceDiagram
    participant UI as React UI
    participant IPC as IPC Bridge
    participant CS as Competition Scorer
    participant Store as Storage

    UI->>IPC: invoke("scoring:score-competition", compId)
    IPC->>CS: scoreCompetition(competition)

    CS->>Store: getTaskResults(taskId) for each task
    Store-->>CS: TaskResult[][]

    loop For each participant
        CS->>CS: Sum task points
        CS->>CS: Apply FTV (discard factor)
        CS->>CS: Calculate total
    end

    CS->>CS: Rank by total points
    CS->>Store: saveCompetitionResults(results)
    Store-->>CS: Success
    CS-->>IPC: CompetitionResult[]
    IPC-->>UI: Display standings
```

## Data Transformation Pipeline

### XCTrack to TaskDefinition

```
.xctsk JSON                    TaskDefinition
┌────────────────────┐         ┌────────────────────┐
│ taskType: "RACE"   │         │ taskType: "Race"   │
│ turnpoints: [      │         │ turnpoints: [      │
│   { type, radius,  │ ──────► │   { id, geopoint,  │
│     waypoint: {    │         │     radius, open,  │
│       name, lat,   │         │     close, type }  │
│       lon, alt }}  │         │ ]                  │
│ ]                  │         │ startGates: [...]  │
│ sss: { timeGates } │         │ taskDistance: 45.2 │
│ goal: { type }     │         │ ssIndex: 1         │
└────────────────────┘         │ esIndex: 4         │
                               └────────────────────┘
```

### IGC to FlightAnalysis

```
IGCFile (from igc-parser)      FlightAnalysis
┌────────────────────┐         ┌────────────────────┐
│ fixes: [           │         │ pilotId: 123       │
│   { timestamp,     │         │ crossings: [       │
│     lat, lon,      │ ──────► │   { tpIndex, time, │
│     gpsAlt,        │         │     isEnter }      │
│     pressureAlt }  │         │ ]                  │
│ ]                  │         │ distanceFlown: 42.1│
│ pilot: "Name"      │         │ startTime: ...     │
│ date: "2024-01-01" │         │ essTime: ...       │
└────────────────────┘         │ leadingCoeff: 2.4  │
                               │ reachedGoal: true  │
                               └────────────────────┘
```

### FlightAnalysis to TaskResult

```
FlightAnalysis + Formula       TaskResult
┌────────────────────┐         ┌────────────────────┐
│ distanceFlown: 42.1│         │ participantId: 123 │
│ startTime: 10:30   │         │ distance: 42.1     │
│ essTime: 12:45     │         │ time: 8100         │
│ leadingCoeff: 2.4  │ ──────► │ distancePoints: 456│
│ reachedGoal: true  │         │ timePoints: 312    │
│ maxAltitude: 2500  │         │ leadingPoints: 89  │
│                    │         │ totalPoints: 857   │
└────────────────────┘         │ rank: 3            │
                               └────────────────────┘
```

## State Synchronization

### Between Main and Renderer

```mermaid
flowchart LR
    subgraph "Main Process"
        STORE[(Storage)]
        HANDLERS[IPC Handlers]
    end

    subgraph "Renderer Process"
        CTX[Context State]
        CACHE[Local Cache]
    end

    STORE <-->|Read/Write| HANDLERS
    HANDLERS <-->|IPC Messages| CTX
    CTX -->|Update| CACHE
    CACHE -->|Persist| CTX

    note1[localStorage persists<br/>context state for<br/>quick restoration]
```

### Context State Updates

```typescript
// Renderer: competitionContext.tsx

// Load from localStorage on mount
useEffect(() => {
  const stored = localStorage.getItem("competition");
  if (stored) {
    setState(JSON.parse(stored));
  }
}, []);

// Persist to localStorage on change
useEffect(() => {
  localStorage.setItem("competition", JSON.stringify(state));
}, [state]);

// Sync with main process for file operations
const loadCompetition = async (path: string) => {
  const data = await window.competition.loadCompetition(path);
  setState(prev => ({ ...prev, ...data }));
};
```

## Error Handling Flow

```mermaid
flowchart TD
    START[Operation Start] --> TRY[Try Operation]
    TRY -->|Success| SUCCESS[Return Result]
    TRY -->|Error| CATCH[Catch Error]

    CATCH --> TYPE{Error Type?}

    TYPE -->|File Not Found| E1[FileNotFoundError]
    TYPE -->|Parse Error| E2[ParseError]
    TYPE -->|Validation Error| E3[ValidationError]
    TYPE -->|Unknown| E4[GenericError]

    E1 --> LOG[Log Error]
    E2 --> LOG
    E3 --> LOG
    E4 --> LOG

    LOG --> IPC_ERR[Send Error via IPC]
    IPC_ERR --> CTX_ERR[Update Context Error State]
    CTX_ERR --> UI_ERR[Display Error in UI]
```

## Performance Considerations

### Batch Processing

```mermaid
flowchart LR
    subgraph "Sequential (Slow)"
        S1[IGC 1] --> S2[IGC 2] --> S3[IGC 3]
    end

    subgraph "Parallel (Fast)"
        P1[IGC 1]
        P2[IGC 2]
        P3[IGC 3]
        P1 --> MERGE
        P2 --> MERGE
        P3 --> MERGE
        MERGE[Results]
    end
```

### Progress Reporting

```typescript
// Main process: taskScorer.ts
async function scoreTask(options: ScoringOptions, onProgress: ProgressCallback) {
  const { participants } = options;
  const total = participants.length;

  for (let i = 0; i < total; i++) {
    const percent = Math.round((i / total) * 100);
    onProgress(percent, `Scoring pilot ${i + 1} of ${total}`);

    await scorePilot(participants[i]);
  }

  onProgress(100, "Scoring complete");
}
```
