export function extractIdsFromFiles(filePaths: string[]): string[] {
  return filePaths
    .map((filePath) => {
      const match = filePath.match(/\.([0-9]+)\.igc$/);
      return match ? match[1] : null;
    })
    .filter((number) => number !== null);
}
