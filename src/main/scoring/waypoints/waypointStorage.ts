/**
 * File-based waypoint library storage
 *
 * Stores waypoints in {storagePath}/waypoints/library.json
 * Uses the same configurable storage path as competition storage.
 */

import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import type {
  LibraryWaypoint,
  WaypointFilter,
  WaypointLibraryData,
} from "../types";

const LIBRARY_VERSION = 1;
const WAYPOINTS_DIR = "waypoints";
const LIBRARY_FILE = "library.json";

/**
 * Waypoint library storage class
 */
export class WaypointStorage {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Update the base directory (called when storage path changes)
   */
  setBaseDir(baseDir: string): void {
    this.baseDir = baseDir;
  }

  /**
   * Get the waypoints directory path
   */
  private getWaypointsDir(): string {
    return path.join(this.baseDir, WAYPOINTS_DIR);
  }

  /**
   * Get the library file path
   */
  private getLibraryPath(): string {
    return path.join(this.getWaypointsDir(), LIBRARY_FILE);
  }

  /**
   * Ensure the waypoints directory exists
   */
  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.getWaypointsDir(), { recursive: true });
  }

  /**
   * Read the library data from disk
   */
  private async readLibrary(): Promise<WaypointLibraryData> {
    try {
      const content = await fs.readFile(this.getLibraryPath(), "utf-8");
      return JSON.parse(content) as WaypointLibraryData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          version: LIBRARY_VERSION,
          updatedAt: new Date().toISOString(),
          waypoints: [],
        };
      }
      throw error;
    }
  }

  /**
   * Write the library data to disk
   */
  private async writeLibrary(data: WaypointLibraryData): Promise<void> {
    await this.ensureDir();
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(
      this.getLibraryPath(),
      JSON.stringify(data, null, 2),
      "utf-8"
    );
  }

  /**
   * List all waypoints, optionally filtered
   */
  async list(filter?: WaypointFilter): Promise<LibraryWaypoint[]> {
    const library = await this.readLibrary();
    let waypoints = library.waypoints;

    if (filter) {
      if (filter.query) {
        const query = filter.query.toLowerCase();
        waypoints = waypoints.filter(
          (wp) =>
            wp.name.toLowerCase().includes(query) ||
            wp.code?.toLowerCase().includes(query) ||
            wp.description?.toLowerCase().includes(query)
        );
      }

      if (filter.country) {
        waypoints = waypoints.filter((wp) => wp.country === filter.country);
      }

      if (filter.source) {
        waypoints = waypoints.filter((wp) => wp.source === filter.source);
      }
    }

    // Sort by name
    waypoints.sort((a, b) => a.name.localeCompare(b.name));

    return waypoints;
  }

  /**
   * Get a single waypoint by ID
   */
  async get(id: string): Promise<LibraryWaypoint | null> {
    const library = await this.readLibrary();
    return library.waypoints.find((wp) => wp.id === id) || null;
  }

  /**
   * Add a new waypoint
   */
  async add(
    waypoint: Omit<LibraryWaypoint, "id" | "createdAt" | "updatedAt">
  ): Promise<LibraryWaypoint> {
    const library = await this.readLibrary();
    const now = new Date().toISOString();

    const newWaypoint: LibraryWaypoint = {
      ...waypoint,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    library.waypoints.push(newWaypoint);
    await this.writeLibrary(library);

    console.log(`Added waypoint: ${newWaypoint.id} - ${newWaypoint.name}`);
    return newWaypoint;
  }

  /**
   * Add multiple waypoints (for bulk import)
   */
  async addMany(
    waypoints: Array<Omit<LibraryWaypoint, "id" | "createdAt" | "updatedAt">>
  ): Promise<LibraryWaypoint[]> {
    const library = await this.readLibrary();
    const now = new Date().toISOString();

    const newWaypoints: LibraryWaypoint[] = waypoints.map((wp) => ({
      ...wp,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }));

    library.waypoints.push(...newWaypoints);
    await this.writeLibrary(library);

    console.log(`Added ${newWaypoints.length} waypoints`);
    return newWaypoints;
  }

  /**
   * Update an existing waypoint
   */
  async update(
    id: string,
    updates: Partial<Omit<LibraryWaypoint, "id" | "createdAt">>
  ): Promise<LibraryWaypoint> {
    const library = await this.readLibrary();
    const index = library.waypoints.findIndex((wp) => wp.id === id);

    if (index === -1) {
      throw new Error(`Waypoint not found: ${id}`);
    }

    library.waypoints[index] = {
      ...library.waypoints[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.writeLibrary(library);
    console.log(`Updated waypoint: ${id}`);

    return library.waypoints[index];
  }

  /**
   * Delete a waypoint
   */
  async delete(id: string): Promise<void> {
    const library = await this.readLibrary();
    const index = library.waypoints.findIndex((wp) => wp.id === id);

    if (index === -1) {
      throw new Error(`Waypoint not found: ${id}`);
    }

    library.waypoints.splice(index, 1);
    await this.writeLibrary(library);

    console.log(`Deleted waypoint: ${id}`);
  }

  /**
   * Delete multiple waypoints
   */
  async deleteMany(ids: string[]): Promise<void> {
    const library = await this.readLibrary();
    const idSet = new Set(ids);

    library.waypoints = library.waypoints.filter((wp) => !idSet.has(wp.id));
    await this.writeLibrary(library);

    console.log(`Deleted ${ids.length} waypoints`);
  }

  /**
   * Check if a waypoint with the same name and coordinates already exists
   */
  async findDuplicate(
    name: string,
    latitude: number,
    longitude: number,
    tolerance = 0.0001 // ~11 meters
  ): Promise<LibraryWaypoint | null> {
    const library = await this.readLibrary();

    return (
      library.waypoints.find(
        (wp) =>
          wp.name.toLowerCase() === name.toLowerCase() ||
          (Math.abs(wp.latitude - latitude) < tolerance &&
            Math.abs(wp.longitude - longitude) < tolerance)
      ) || null
    );
  }
}

/**
 * Create a waypoint storage instance
 */
export function createWaypointStorage(baseDir: string): WaypointStorage {
  return new WaypointStorage(baseDir);
}
