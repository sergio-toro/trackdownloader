# XCTrack .xctsk Format

Documentation of the XCTrack task file format for import into the scoring system.

## Overview

XCTrack uses JSON-based `.xctsk` files to define competition tasks. These files contain turnpoint definitions, start gates, and goal settings.

## File Structure

```json
{
  "taskType": "RACE",
  "version": 1,
  "earthModel": "WGS84",
  "turnpoints": [...],
  "sss": {...},
  "goal": {...}
}
```

---

## Complete Example

```json
{
  "taskType": "RACE",
  "version": 1,
  "earthModel": "WGS84",
  "turnpoints": [
    {
      "type": "TAKEOFF",
      "radius": 400,
      "waypoint": {
        "name": "Piedrahita Launch",
        "description": "Main launch site",
        "lat": 40.456789,
        "lon": -5.234567,
        "altSmoothed": 1420
      }
    },
    {
      "type": "SSS",
      "radius": 3000,
      "waypoint": {
        "name": "Start",
        "description": "Speed section start",
        "lat": 40.467890,
        "lon": -5.245678,
        "altSmoothed": 1500
      }
    },
    {
      "type": "TURNPOINT",
      "radius": 400,
      "waypoint": {
        "name": "TP1 - Valley",
        "description": "First turnpoint",
        "lat": 40.512345,
        "lon": -5.198765,
        "altSmoothed": 1200
      }
    },
    {
      "type": "TURNPOINT",
      "radius": 400,
      "waypoint": {
        "name": "TP2 - Ridge",
        "description": "Second turnpoint",
        "lat": 40.534567,
        "lon": -5.267890,
        "altSmoothed": 1800
      }
    },
    {
      "type": "ESS",
      "radius": 2000,
      "waypoint": {
        "name": "End of Speed",
        "description": "Speed section end",
        "lat": 40.478901,
        "lon": -5.256789,
        "altSmoothed": 1400
      }
    },
    {
      "type": "GOAL",
      "radius": 400,
      "waypoint": {
        "name": "Goal Field",
        "description": "Goal landing field",
        "lat": 40.468012,
        "lon": -5.246890,
        "altSmoothed": 1100
      }
    }
  ],
  "sss": {
    "type": "RACE",
    "direction": "ENTER",
    "timeGates": [
      "2024-06-15T11:30:00Z"
    ]
  },
  "goal": {
    "type": "CYLINDER",
    "deadline": "2024-06-15T18:00:00Z"
  }
}
```

---

## Field Reference

### Root Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskType` | string | Yes | Task type: `"RACE"` or `"ELAPSED_TIME"` |
| `version` | number | Yes | Format version (currently `1`) |
| `earthModel` | string | Yes | `"WGS84"` or `"FAI_SPHERE"` |
| `turnpoints` | array | Yes | Array of turnpoint objects |
| `sss` | object | Yes | Start configuration |
| `goal` | object | Yes | Goal configuration |

### Turnpoint Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Turnpoint type (see below) |
| `radius` | number | Yes | Cylinder radius in meters |
| `waypoint` | object | Yes | Waypoint details |

**Turnpoint Types:**
- `"TAKEOFF"` - Launch/takeoff area
- `"SSS"` - Start of Speed Section
- `"TURNPOINT"` - Regular turnpoint
- `"ESS"` - End of Speed Section
- `"GOAL"` - Goal area

### Waypoint Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Waypoint name |
| `description` | string | No | Optional description |
| `lat` | number | Yes | Latitude in decimal degrees |
| `lon` | number | Yes | Longitude in decimal degrees |
| `altSmoothed` | number | Yes | Altitude in meters |

### SSS (Start) Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | `"RACE"` (all start together) or `"ELAPSED_TIME"` |
| `direction` | string | Yes | `"ENTER"` or `"EXIT"` |
| `timeGates` | array | Yes | Array of ISO 8601 datetime strings |

### Goal Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | `"CYLINDER"` or `"LINE"` |
| `deadline` | string | Yes | Task deadline (ISO 8601) |

---

## Task Type Examples

### Race Task

Standard race format where all pilots start at the same time.

```json
{
  "taskType": "RACE",
  "sss": {
    "type": "RACE",
    "direction": "ENTER",
    "timeGates": ["2024-06-15T11:30:00Z"]
  }
}
```

### Elapsed Time Task

Pilots can start in different time windows, scored on elapsed time.

```json
{
  "taskType": "ELAPSED_TIME",
  "sss": {
    "type": "ELAPSED_TIME",
    "direction": "ENTER",
    "timeGates": [
      "2024-06-15T11:00:00Z",
      "2024-06-15T11:30:00Z",
      "2024-06-15T12:00:00Z"
    ]
  }
}
```

### Multiple Start Gates

Race task with multiple start gate options.

```json
{
  "taskType": "RACE",
  "sss": {
    "type": "RACE",
    "direction": "ENTER",
    "timeGates": [
      "2024-06-15T11:00:00Z",
      "2024-06-15T11:15:00Z",
      "2024-06-15T11:30:00Z"
    ]
  }
}
```

---

## Goal Types

### Cylinder Goal

Pilot must enter a cylinder centered on the goal waypoint.

```json
{
  "goal": {
    "type": "CYLINDER",
    "deadline": "2024-06-15T18:00:00Z"
  }
}
```

The goal turnpoint radius defines the cylinder size.

### Line Goal

Pilot must cross a line perpendicular to the final leg.

```json
{
  "goal": {
    "type": "LINE",
    "deadline": "2024-06-15T18:00:00Z"
  }
}
```

---

## Minimal Valid Task

Minimum required fields for a valid task:

```json
{
  "taskType": "RACE",
  "version": 1,
  "earthModel": "WGS84",
  "turnpoints": [
    {
      "type": "TAKEOFF",
      "radius": 400,
      "waypoint": {
        "name": "Launch",
        "lat": 40.0,
        "lon": -5.0,
        "altSmoothed": 1000
      }
    },
    {
      "type": "SSS",
      "radius": 2000,
      "waypoint": {
        "name": "Start",
        "lat": 40.01,
        "lon": -5.01,
        "altSmoothed": 1000
      }
    },
    {
      "type": "ESS",
      "radius": 2000,
      "waypoint": {
        "name": "ESS",
        "lat": 40.5,
        "lon": -5.5,
        "altSmoothed": 1000
      }
    },
    {
      "type": "GOAL",
      "radius": 400,
      "waypoint": {
        "name": "Goal",
        "lat": 40.5,
        "lon": -5.5,
        "altSmoothed": 1000
      }
    }
  ],
  "sss": {
    "type": "RACE",
    "direction": "ENTER",
    "timeGates": ["2024-06-15T11:00:00Z"]
  },
  "goal": {
    "type": "CYLINDER",
    "deadline": "2024-06-15T18:00:00Z"
  }
}
```

---

## Validation Rules

When importing an .xctsk file, validate:

1. **Required turnpoints**: Must have TAKEOFF, SSS, ESS, and GOAL
2. **Order**: SSS must come before ESS, ESS must come before GOAL
3. **Radius**: All radii must be positive numbers
4. **Coordinates**: Latitude -90 to 90, Longitude -180 to 180
5. **Time gates**: At least one time gate required
6. **Deadline**: Must be after all time gates

---

## Parsing Notes

### Coordinate Precision

XCTrack uses 6 decimal places for coordinates (approximately 10cm precision).

### Time Zone Handling

All times in .xctsk files are in UTC (ISO 8601 with Z suffix).

### Altitude

The `altSmoothed` field represents the smoothed terrain altitude, not GPS altitude.
