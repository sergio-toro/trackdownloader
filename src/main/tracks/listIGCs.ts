import fs from "fs";

export async function listIGCs(directory: string) {
  try {
    // read all igc files from the directory
    const files = fs.readdirSync(directory);
    return files.filter((file) => file.endsWith(".igc"));
  } catch (error) {
    console.error("Error listing IGC files:", error);
    throw error;
  }
}
