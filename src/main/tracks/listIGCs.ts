import fs from "fs";
import IGCParser from "igc-parser";
import { fromUnixTime, intervalToDuration } from "date-fns";

// interface IGCFile {
//   date: string;
//   numFlight: number   pilot: string   copilot: string   gliderType: string   registration: string   callsign: string   competitionClass: string   site: string   loggerId: string   loggerManufacturer: string   loggerType: string   firmwareVersion: string   hardwareVersion: string   task: Task   fixes: BRecord[]   dataRecords: KRecord[]   security: string   errors: Error[] }
export async function listIGCs(directory: string) {
  try {
    // read all igc files from the directory
    const igcFiles = fs
      .readdirSync(directory)
      .filter((file) => file.endsWith(".igc"));

    for (const file of igcFiles) {
      const content = fs.readFileSync(`${directory}/${file}`, "utf8");
      const parsed = IGCParser.parse(content);
      const startTime = fromUnixTime(Number(parsed.fixes[0].time));
      const endTime = fromUnixTime(
        Number(parsed.fixes[parsed.fixes.length - 1].time)
      );
      const duration = intervalToDuration({ start: startTime, end: endTime });

      console.log("PARSED", { ...parsed, fixes: null });
      console.log(
        "POINTS",
        parsed.fixes[0],
        parsed.fixes[parsed.fixes.length - 1]
      );

      return [
        {
          name: file,
          date: parsed.fixes[0].time,
          pilot: parsed.pilot,
          // glider: parsed.glider,
          site: parsed.site,
          startTime,
          endTime,
          duration,
          // takeoff: parsed.fixes[0].location,
          // landing: parsed.fixes[parsed.fixes.length - 1].location,
          // duration: parsed.fixes[parsed.fixes.length - 1].time - parsed.fix,
        },
      ];
    }
    // return files
    //   .filter((file) => file.endsWith(".igc"))
    //   .map((file) => {
    //
    //   });
  } catch (error) {
    console.error("Error listing IGC files:", error);
    throw error;
  }
}
