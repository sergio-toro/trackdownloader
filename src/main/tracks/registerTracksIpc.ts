import { BrowserWindow, dialog, ipcMain } from "electron";
import { downloadFile } from "@main/tracks/downloadFile";
import { unzipFile } from "@main/tracks/unzipFile";
import { listIGCs } from "@main/tracks/listIGCs";
import { deleteIGCs } from "./deleteFile";

export default function registerTracksIpc(appWindow: BrowserWindow) {
  ipcMain.handle("track-select-directory", async () => {
    const result = await dialog.showOpenDialog(appWindow, {
      properties: ["openDirectory"],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      console.log("Selected folder path:", result.filePaths[0]);
      return result.filePaths[0];
    } else {
      throw new Error("No folder selected");
    }
  });

  ipcMain.handle(
    "track-download-file",
    async (_, fileUrl: string, filePath: string): Promise<string> => {
      try {
        return await downloadFile(fileUrl, filePath);
      } catch (error) {
        console.error("Error downloading Flymaster IGCs:", error);
      }
    }
  );

  ipcMain.handle(
    "track-unzip-file",
    async (_, filePath: string, outputDirectory: string) => {
      try {
        return await unzipFile(filePath, outputDirectory);
      } catch (error) {
        console.error("Error unzipping file", error);
      }
    }
  );

  ipcMain.handle("track-list-igcs", async (_, directory: string) => {
    try {
      return await listIGCs(directory);
    } catch (error) {
      console.error("Error unzipping file", error);
    }
  });
  ipcMain.handle("track-delete-igcs", async (_, filePath: string) => {
    try {
      return await deleteIGCs(filePath);
    } catch (error) {
      console.error("Error deleting file", error);
    }
  });
}
