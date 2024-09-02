import fs from "fs/promises";

export async function moveFile(sourcePath: string, destinationPath: string) {
  try {
    await fs.rename(sourcePath, destinationPath);
    console.log(`File moved from ${sourcePath} to ${destinationPath}`);
  } catch (error) {
    console.error("Error moving file:", error);
    throw error;
  }
}
