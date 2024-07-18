export function extractIdsAndNamesFromFiles(
  filePaths: string[]
): { pilotId: string; pilotName: string }[] {
  return filePaths.map((filePath) => {
    const idMatch = filePath.match(/\.(\d+)\.igc$/);
    const pilotId = idMatch ? idMatch[1] : "";

    const nameMatch = filePath.match(/LiveTrack (.+) -/);
    const pilotName = nameMatch ? nameMatch[1] : "";

    return { pilotId, pilotName };
  });
}
