import fs from "fs/promises";

export async function deleteIGCs(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    console.log(`Deleted file at ${filePath}`);
  } catch (error) {
    console.error(`Error deleting file at ${filePath}:`, error);
    throw error;
  }
}
