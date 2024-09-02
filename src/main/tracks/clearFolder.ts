import fs from "fs/promises";

export async function clearFolder(directory: string): Promise<void> {
  try {
    const files = await fs.readdir(directory);
    console.log(`Files in ${directory}:`, files);
    for (const file of files) {
      const filePath = `${directory}/${file}`;
      await fs.unlink(filePath);
      console.log(`Deleted file at ${filePath}`);
    }
    console.log(`Deleted all files in ${directory}`);
  } catch (error) {
    console.error(`Error clearing directory ${directory}:`, error);
    throw error;
  }
}
