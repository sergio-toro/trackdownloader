/**
 * Waypoint library types for persistent waypoint storage
 */

/**
 * Waypoint stored in the library
 */
export interface LibraryWaypoint {
  id: string;
  name: string;
  code?: string; // Short code (e.g., from CUP file)
  latitude: number;
  longitude: number;
  altitude: number; // meters
  description?: string;
  country?: string; // ISO 2-letter code
  source?: string; // "manual" | filename
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

/**
 * Filter options for waypoint search
 */
export interface WaypointFilter {
  query?: string; // Search name/code/description
  country?: string;
  source?: string;
}

/**
 * Result of CUP file import
 */
export interface CupImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  waypoints: LibraryWaypoint[];
}

/**
 * Waypoint library file structure
 */
export interface WaypointLibraryData {
  version: number;
  updatedAt: string;
  waypoints: LibraryWaypoint[];
}
