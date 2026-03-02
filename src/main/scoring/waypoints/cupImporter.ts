/**
 * CUP file parser for SeeYou waypoint format
 *
 * CUP format specification:
 * - CSV format with header line
 * - Fields: name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc
 * - Coordinates in DDMM.MMMN/S or DDDMM.MMME/W format
 * - Elevation in meters (m) or feet (ft)
 *
 * Reference: https://downloads.naviter.com/docs/SeeYou_CUP_file_format.pdf
 */

import fs from "fs/promises";
import path from "path";

import type { LibraryWaypoint, CupImportResult } from "../types";
import { WaypointStorage } from "./waypointStorage";

/**
 * Parse a CUP coordinate string to decimal degrees
 *
 * Format: DDMM.MMMN/S (latitude) or DDDMM.MMME/W (longitude)
 * Examples:
 *   "4207.407N" -> 42.123450 (latitude)
 *   "00114.073W" -> -1.234550 (longitude)
 */
function parseCupCoordinate(coord: string): number | null {
  if (!coord || coord.length < 5) return null;

  const direction = coord.slice(-1).toUpperCase();
  const numPart = coord.slice(0, -1);

  // Validate direction
  if (!["N", "S", "E", "W"].includes(direction)) {
    return null;
  }

  // Find decimal point position
  const dotIndex = numPart.indexOf(".");
  if (dotIndex === -1) return null;

  // Degrees are everything before the last 2 digits before decimal
  const degreesEnd = dotIndex - 2;
  if (degreesEnd < 1) return null;

  const degrees = parseFloat(numPart.slice(0, degreesEnd));
  const minutes = parseFloat(numPart.slice(degreesEnd));

  if (isNaN(degrees) || isNaN(minutes)) return null;
  if (minutes < 0 || minutes >= 60) return null;

  let decimal = degrees + minutes / 60;

  // Apply sign based on direction
  if (direction === "S" || direction === "W") {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Parse elevation string to meters
 *
 * Examples: "1200.0m", "3937ft", "1200"
 */
function parseElevation(elev: string): number {
  if (!elev) return 0;

  const cleaned = elev.trim().toLowerCase();

  if (cleaned.endsWith("ft")) {
    const feet = parseFloat(cleaned.slice(0, -2));
    return isNaN(feet) ? 0 : Math.round(feet * 0.3048);
  }

  if (cleaned.endsWith("m")) {
    const meters = parseFloat(cleaned.slice(0, -1));
    return isNaN(meters) ? 0 : Math.round(meters);
  }

  // Assume meters if no unit
  const meters = parseFloat(cleaned);
  return isNaN(meters) ? 0 : Math.round(meters);
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  fields.push(current.trim());

  return fields;
}

/**
 * Parsed CUP waypoint before conversion to LibraryWaypoint
 */
interface CupWaypoint {
  name: string;
  code: string;
  country: string;
  latitude: number;
  longitude: number;
  altitude: number;
  style: number;
  description?: string;
}

/**
 * Parse a CUP file content into waypoints
 */
export function parseCupFile(
  content: string,
  _sourceName: string
): { waypoints: CupWaypoint[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const errors: string[] = [];
  const waypoints: CupWaypoint[] = [];

  if (lines.length === 0) {
    errors.push("Empty file");
    return { waypoints, errors };
  }

  // Skip header line
  const dataLines = lines.slice(1);

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const lineNum = i + 2; // 1-indexed, accounting for header

    // Skip task definition section if present
    if (line.startsWith("-----Related Tasks-----")) {
      break;
    }

    try {
      const fields = parseCsvLine(line);

      // Minimum required fields: name, code, country, lat, lon, elev
      if (fields.length < 6) {
        errors.push(`Line ${lineNum}: Not enough fields`);
        continue;
      }

      const [
        name,
        code,
        country,
        latStr,
        lonStr,
        elevStr,
        styleStr,
        ,
        ,
        ,
        desc,
      ] = fields;

      if (!name) {
        errors.push(`Line ${lineNum}: Missing name`);
        continue;
      }

      const latitude = parseCupCoordinate(latStr);
      const longitude = parseCupCoordinate(lonStr);

      if (latitude === null) {
        errors.push(`Line ${lineNum}: Invalid latitude "${latStr}"`);
        continue;
      }

      if (longitude === null) {
        errors.push(`Line ${lineNum}: Invalid longitude "${lonStr}"`);
        continue;
      }

      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90) {
        errors.push(`Line ${lineNum}: Latitude out of range: ${latitude}`);
        continue;
      }

      if (longitude < -180 || longitude > 180) {
        errors.push(`Line ${lineNum}: Longitude out of range: ${longitude}`);
        continue;
      }

      const altitude = parseElevation(elevStr);
      const style = parseInt(styleStr, 10) || 1;

      waypoints.push({
        name: name.replace(/^"|"$/g, ""), // Remove surrounding quotes
        code: code?.replace(/^"|"$/g, "") || "",
        country: country?.toUpperCase() || "",
        latitude,
        longitude,
        altitude,
        style,
        description: desc?.replace(/^"|"$/g, ""),
      });
    } catch (error) {
      errors.push(`Line ${lineNum}: Parse error - ${error}`);
    }
  }

  return { waypoints, errors };
}

/**
 * Import a CUP file into the waypoint library
 *
 * @param filePath Path to the .cup file
 * @param storage Waypoint storage instance
 * @param skipDuplicates Whether to skip waypoints that already exist
 */
export async function importCupFile(
  filePath: string,
  storage: WaypointStorage,
  skipDuplicates = true
): Promise<CupImportResult> {
  const fileName = path.basename(filePath);

  // Read file content
  let content: string;
  try {
    // Try UTF-8 first
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    // Fall back to latin1 (Windows-1252 compatible)
    content = await fs.readFile(filePath, "latin1");
  }

  // Parse the file
  const { waypoints: parsed, errors } = parseCupFile(content, fileName);

  const result: CupImportResult = {
    imported: 0,
    skipped: 0,
    errors,
    waypoints: [],
  };

  // Convert and add to library
  const toAdd: Array<Omit<LibraryWaypoint, "id" | "createdAt" | "updatedAt">> =
    [];

  for (const wp of parsed) {
    if (skipDuplicates) {
      const duplicate = await storage.findDuplicate(
        wp.name,
        wp.latitude,
        wp.longitude
      );
      if (duplicate) {
        result.skipped++;
        continue;
      }
    }

    toAdd.push({
      name: wp.name,
      code: wp.code || undefined,
      latitude: wp.latitude,
      longitude: wp.longitude,
      altitude: wp.altitude,
      description: wp.description,
      country: wp.country || undefined,
      source: fileName,
    });
  }

  if (toAdd.length > 0) {
    const added = await storage.addMany(toAdd);
    result.waypoints = added;
    result.imported = added.length;
  }

  console.log(
    `CUP import complete: ${result.imported} imported, ${result.skipped} skipped, ${errors.length} errors`
  );

  return result;
}
