import fs from "fs";
import AdmZip from "adm-zip";
import path from "path";

export async function decompressAndListFiles(
  zipFilePath: string,
  outputFolderPath: string
) {
  try {
    const zip = new AdmZip(zipFilePath);
    const extractedFiles: string[] = [];

    zip.getEntries().forEach((entry) => {
      const entryPath = path.join(
        outputFolderPath,
        path.basename(entry.entryName)
      );
      if (!entry.isDirectory) {
        fs.writeFileSync(entryPath, entry.getData());
        extractedFiles.push(entryPath);
      }
    });

    return extractedFiles;
  } catch (error) {
    console.error("Error extracting ZIP file:", error);
    throw error;
  }
}
