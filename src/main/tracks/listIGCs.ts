import fs from "fs";
import IGCParser from "@main/lib/igc-parser";
import { formatDuration, intervalToDuration } from "date-fns";

const FILENAME_REGEX = /(XContest|LiveTrack|Volandoo)\s([^-]*)\s-.*$/;
type TrackSource = "XContest" | "LiveTrack" | "Volandoo" | "Unknown";

export interface PilotIgc {
  name: string;
  source: TrackSource;
  pilotName: string;
  pilotId: number;
  loggerType: string;
  glider: string;
  site: string;
  date: string;
  start: {
    time: string;
    timestamp: number;
    lat: number;
    lng: number;
  };
  end: {
    time: string;
    timestamp: number;
    lat: number;
    lng: number;
  };
  duration: string;
}

export interface InvalidIgc {
  name: string;
  source: TrackSource;
  pilotId: number;
  errorMessage: string;
}

export interface ListIGCsResponse {
  validIgcs: PilotIgc[];
  invalidIgcs: InvalidIgc[];
}

export async function listIGCs(directory: string): Promise<ListIGCsResponse> {
  try {
    // read all igc files from the directory
    const igcFiles = fs
      .readdirSync(directory)
      .filter((file) => file.endsWith(".igc"));

    const validPilotIgcs = [];
    const invalidIgcs = [];

    for (const file of igcFiles) {
      // Check pilot id
      const matchId = file.match(/\.(\d+)\.igc$/);

      if (!matchId) {
        console.error("IGC File not matched to a pilot id.", file);
        continue;
      }

      const matchDetails = file.match(FILENAME_REGEX);
      const pilotId = Number(matchId[1]);
      const source: TrackSource = matchDetails
        ? (matchDetails[1] as "XContest" | "LiveTrack" | "Volandoo")
        : "Unknown";
      const content = fs.readFileSync(`${directory}/${file}`, "utf8");

      try {
        const parsed = IGCParser.parse(content);
        const startTime = new Date(parsed.fixes[0].timestamp);
        const endTime = new Date(
          parsed.fixes[parsed.fixes.length - 1].timestamp
        );
        const duration = intervalToDuration({ start: startTime, end: endTime });

        validPilotIgcs.push({
          name: file,
          pilotName: matchDetails ? matchDetails[2] : parsed.pilot,
          source,
          pilotId,
          loggerType: parsed.loggerType,
          glider: parsed.gliderType,
          site: parsed.site,
          date: parsed.date,
          start: {
            time: startTime.toUTCString(),
            timestamp: parsed.fixes[0].timestamp,
            lat: parsed.fixes[0].latitude,
            lng: parsed.fixes[0].longitude,
          },
          end: {
            time: endTime.toUTCString(),
            timestamp: parsed.fixes[parsed.fixes.length - 1].timestamp,
            lat: parsed.fixes[parsed.fixes.length - 1].latitude,
            lng: parsed.fixes[parsed.fixes.length - 1].longitude,
          },
          duration: formatDuration(duration),
        });
      } catch (error) {
        console.error("Error parsing IGC file:", file, error);

        invalidIgcs.push({
          name: file,
          source,
          pilotId,
          errorMessage: error.message,
        });
      }
    }

    return {
      validIgcs: validPilotIgcs,
      invalidIgcs: invalidIgcs,
    };
  } catch (error) {
    console.error("Error listing IGC files:", error);
    throw error;
  }
}
