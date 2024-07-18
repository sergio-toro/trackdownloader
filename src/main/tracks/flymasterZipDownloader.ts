import fs from "fs";
import fetch from "node-fetch";
import { decompressAndListFiles } from "./decompressAndListFiles";
import { extractIdsFromFiles } from "./extractIdsFromFiles";

export async function handleDownloadIGCs(
  zipURL: string,
  selectedFolderPath: string
) {
  try {
    const response = await fetch(zipURL);
    if (!response.ok) {
      throw new Error(
        `Failed to download ZIP file: ${response.status} ${response.statusText}`
      );
    }

    const buffer = await response.buffer();

    const fileName = "flymaster-tracks.zip";
    const filePath = `${selectedFolderPath}/${fileName}`;

    fs.writeFileSync(filePath, buffer);

    console.log("File saved successfully:", filePath);

    const files = await decompressAndListFiles(filePath, selectedFolderPath);
    console.log("Extracted files:", files);

    const trackerNumbers = extractIdsFromFiles(files);
    console.log("Extracted numbers:", trackerNumbers);

    return { files, trackerNumbers };
  } catch (error) {
    console.error("Error downloading or saving ZIP:", error);
  }
}
