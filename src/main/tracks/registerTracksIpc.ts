import { BrowserWindow, dialog, ipcMain } from "electron";

export default function registerTracksIpc(appWindow: BrowserWindow) {
  ipcMain.handle("file-directory", async () => {
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
}
