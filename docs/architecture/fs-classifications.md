# FS Classification System: Categories, Teams & Feminine

Reference documentation for how FlightSys (FS) implements pilot classifications.
Source code at `/Users/sergio/storo/FS/`.

## Overview

FS has three classification systems:

1. **Categories** — Attribute-based sub-rankings (e.g., Women, Serial, Sport, Club)
2. **Teams** — Group rankings by shared attribute (e.g., Nation, Club)
3. **Feminine** — Not special; just a category with selector `female equals 1`

All three are **user-defined and generic** — no hard-coded wing classes or category names.

---

## 1. Categories

### Data Structure

**`CompCategory`** (`FsFsdb/CompCategory.cs`):

| Property | Type | Description |
|----------|------|-------------|
| `Name` | string | Display name (e.g., "Women", "Serial") |
| `Use_filter` | bool | `true` = re-rank from parent; `false` = score independently |
| `Filter_from_category` | string | Parent category name (default: "Overall") |
| `Discard_factor` | decimal | FTV discard factor override (0 = no discards) |
| `Selectors` | List\<CompCategorySelector\> | AND-ed attribute filters |

**`CompCategorySelector`** (`FsFsdb/CompCategorySelector.cs`):

| Property | Type | Description |
|----------|------|-------------|
| `AttributeName` | string | Standard: `"female"`, `"nat_code_ioc"`, `"fai_licence"`. Custom: `"ca:wing_class"` |
| `Comparator` | enum | `equals` (1), `begins_with` (2), `contains` (3) |
| `RequiredValue` | string | Value to match (case-insensitive) |

### FSDB XML Format

```xml
<FsCompCategories>
  <FsCompCategory name="Women" use_filter="True" filter_from="Overall" ftv_factor="0">
    <FsCompCategorySelectors>
      <FsCompCategorySelector attributeName="female" comparator="equals" requiredValue="1"/>
    </FsCompCategorySelectors>
  </FsCompCategory>
  <FsCompCategory name="Serial" use_filter="True" filter_from="Overall" ftv_factor="0">
    <FsCompCategorySelectors>
      <FsCompCategorySelector attributeName="ca:wing_class" comparator="equals" requiredValue="Serial"/>
    </FsCompCategorySelectors>
  </FsCompCategory>
</FsCompCategories>
```

### Attribute Matching Logic

**`Fsdb.Filter_Participants_By_Attribute()`** (`Fsdb.public.misc.cs:178-215`):

1. Iterates all participants
2. Resolves attribute value:
   - If `attributeName` starts with `"ca:"`: looks up custom attribute (strips prefix)
   - Otherwise: reads standard XML attribute from `<FsParticipant>` element
3. Applies comparator (case-insensitive):
   - `equals`: exact match
   - `begins_with`: prefix match
   - `contains`: substring match
4. Returns list of matching participant IDs

Multiple selectors are AND-ed — a participant must match ALL selectors to be included.

### Scoring Flow

#### Two Modes

**Filter mode** (`use_filter=true`, common):
- Takes EXISTING results from parent category
- Keeps only matching pilots
- Re-ranks (preserves original points, just reassigns rank)
- Computationally trivial

**Separate mode** (`use_filter=false`, rare):
- Scores the subset independently from scratch
- Recalculates validity, weights, available points for just that subset
- Different day quality, different available points than Overall

#### Task Results

**`GAP.CreateTaskResults()`** (`FsSfGAP/GAP.cs:1670-1731`):

```
CreateTaskResults(fsdb, task_id, filter, resultId, category_name, filter_from_category)
```

- `filter`: List of matching pilot IDs (from selector matching)
- If `filter_from_category` is empty: loads all task participants, filters by ID list, scores from scratch
- If `filter_from_category` is set: finds parent category's `FsTaskResult`, filters its participant results by ID list, re-ranks
- Sorts by points descending, assigns ranks

#### Competition Results

**`GAP.CreateCompetitionResults()`** (`FsSfGAP/GAP.cs:2020-2100`):

```
CreateCompetitionResults(fsdb, task_ids, taskList, filter, resultId, category_name,
    filter_from_category, top, normalize_1000, discard_factor)
```

- Loads per-task results from `FsTaskResult` elements
- Aggregates across tasks with FTV or Top-X
- Categories can have their own `discard_factor` (FTV override)
- Supports `top` parameter (best N tasks) or FTV-based discarding

#### Dependency Resolution

**`TopologicalCategorySorter`** (`FsFsdb/FsdbUtil/TopologicalCategorySorter.cs`):

Categories can form chains: "Serial Women" filters from "Women" which filters from "Overall".
Topological sort ensures parent categories are scored before children.

Implementation: iterative DFS with a stack, builds dependency graph from `Filter_from_category` references.

### Result XML Output

```xml
<FsTaskResults>
  <FsTaskResult id="Overall" title="Overall" filter_from_category="" report_title="Task 1: Overall V1">
    <FsTaskScoreParams ... />
    <FsTaskResultParticipants>
      <FsTaskParticipantResult id="123" rank="1" points="100.0" ... />
    </FsTaskResultParticipants>
  </FsTaskResult>
  <FsTaskResult id="Women" title="Women" filter_from_category="Overall" report_title="Task 1: Women V1">
    <!-- Same structure, filtered subset -->
  </FsTaskResult>
</FsTaskResults>
```

---

## 2. Teams

### Data Structure

**`CompTeamDefinition`** (`FsFsdb/CompTeamDefinition.cs`):

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `Name` | string | Auto from attribute | Display name (e.g., "Nation") |
| `AttributeName` | string | — | Grouping attribute: `"nat_code_ioc"` for nation, `"ca:club"` for custom |
| `NumberToCount` | int | 3 | Best N pilots counted per task |
| `FirstToCount` | int | 1 | Start counting from rank N (1-based) |
| `DefinitionId` | string | computed | `"{attribute}-{numberToCount}-{firstToCount}"` |

### FSDB XML Format

```xml
<FsCompTeamDefinitions>
  <FsCompTeamDefinition name="Nation" attribute="nat_code_ioc" number_to_count="3" first_to_count="1"/>
  <FsCompTeamDefinition name="Club" attribute="ca:club" number_to_count="2" first_to_count="1"/>
</FsCompTeamDefinitions>
```

### Scoring Algorithm

**`GAP.CreateTeamResults()`** (`FsSfGAP/GAP.cs:1772-1867`):

1. **Get team names**: All unique values for the attribute across all participants
   - For `"nat_code_ioc"`: all nation codes
   - For custom attrs: all unique values of that custom attribute
   - Empty/null values are skipped

2. **Build teams**: For each team name:
   - Find all participants with that attribute value
   - For each participant, collect their task scores from `FsResult.points`

3. **Mark counting scores** (per task):
   - Sort team members by task points (descending)
   - Starting from index `firstToCount - 1`, mark next `numberToCount` members as counting
   - Add counting members' points to team total

4. **Finalize**:
   - Round team total to competition decimal precision
   - Sort teams by total points descending
   - Assign ranks (equal points = equal rank)

### Team Inner Classes

```
Team:
  rank: int
  name: string (team attribute value, e.g. "ESP")
  team_members: List<TeamMember>
  points: double (sum of all counting scores)

TeamMember:
  id: string (participant ID)
  task_scores: double[] (points per task)
  task_score_counts: bool[] (whether this member's score counts per task)
  sum_counting_results: double
  sum_all_results: double
```

### Result XML Output

```xml
<FsTeamResults>
  <FsTeamResult id="nat_code_ioc-3-1" tasks="1,2,3" report_title="Competition: Nation Teams V1">
    <FsTeam rank="1" name="SUI" points="2845.5">
      <FsParticipant id="28320">
        <FsTask id="1" counts="1"/>
        <FsTask id="2" counts="1"/>
        <FsTask id="3" counts="0"/>
      </FsParticipant>
      <!-- more members -->
    </FsTeam>
    <!-- more teams -->
  </FsTeamResult>
</FsTeamResults>
```

---

## 3. Feminine / Gender

### Storage

Participant gender stored as boolean attribute:

```xml
<FsParticipant id="44499" name="Nanda Walliser" female="1" .../>
<FsParticipant id="28320" name="Joerg Ewald" female="0" .../>
```

**`CompParticipant.Female`** (`CompParticipant.cs`): `bool`, defaults to `false`.

### Classification

Women's ranking is simply a category:

```xml
<FsCompCategory name="Women" use_filter="True" filter_from="Overall" ftv_factor="0">
  <FsCompCategorySelectors>
    <FsCompCategorySelector attributeName="female" comparator="equals" requiredValue="1"/>
  </FsCompCategorySelectors>
</FsCompCategory>
```

No special code paths — uses the same category infrastructure.

---

## 4. Custom Attributes

### Storage

Per-participant key-value pairs in FSDB:

```xml
<FsParticipant id="43699" name="John Pilot">
  <FsCustomAttributes>
    <FsCustomAttribute name="wing_class" value="Serial"/>
    <FsCustomAttribute name="Team" value="Alpha"/>
  </FsCustomAttributes>
</FsParticipant>
```

### API

- `GetParticipantsCustomAttributeNames()` — all attribute names used by any participant
- `GetParticipantCustomAttributes(names[], id)` — specific pilot's custom attribute values
- `GetParticipantsCustomAttributeValues(name)` — all unique values for an attribute
- `SetParticipantCustomAttribute(id, name, value)` — set/update/delete a custom attribute

### Referencing in Selectors

Custom attributes are referenced with `"ca:"` prefix in category selectors:
- `attributeName="ca:wing_class"` → looks up custom attribute named `"wing_class"`

Standard attributes (direct XML attributes on `<FsParticipant>`) use no prefix:
- `attributeName="female"` → reads `@female` attribute
- `attributeName="nat_code_ioc"` → reads `@nat_code_ioc` attribute

---

## 5. Orchestration

**`Results2.cs`** (`FsComp/Results2.cs`) orchestrates result creation:

1. `TaskResult()` — creates/retrieves task results for a category
2. `CompetitionResult()` — creates/retrieves competition results, auto-creating task results first
3. `TeamResult()` — creates/retrieves team results

Each method checks if results already exist (by XPath lookup). If not, invokes the scoring formula to create them. Returns a version number for cache invalidation.

Categories are processed in topological order to ensure parent results exist before child categories attempt to filter from them.
