import fs from "fs";
import fetch from "node-fetch";

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

    const fileName = "downloaded.zip";
    const filePath = `${selectedFolderPath}/${fileName}`;

    fs.writeFileSync(filePath, buffer);

    const extractedFilePath = `${selectedFolderPath}/extracted`;
    fs.mkdirSync(extractedFilePath);

    console.log("File saved successfully:", filePath);
  } catch (error) {
    console.error("Error downloading or saving ZIP:", error);
  }
}
