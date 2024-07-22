import fs from "fs";
import fetch from "node-fetch";

export async function downloadFile(
  fileUrl: string,
  filePath: string,
  headers: Record<string, string> = {}
): Promise<string> {
  try {
    const response = await fetch(fileUrl, { headers });
    if (!response.ok) {
      throw new Error(
        `Failed to download file [${fileUrl}]: ${response.status} ${response.statusText}`
      );
    }
    const buffer = await response.buffer();
    fs.writeFileSync(filePath, buffer);

    console.log("File saved successfully:", filePath);

    return filePath;
  } catch (error) {
    console.error("Error downloading file:", fileUrl, filePath, headers, error);
  }
}
