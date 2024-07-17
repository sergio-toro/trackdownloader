import { BrowserWindow, dialog, ipcMain } from "electron";

export default function registerTracksIpc(appWindow: BrowserWindow) {
  ipcMain.handle("file-directory", async () => {
    const result = await dialog.showOpenDialog(appWindow, {
      properties: ["openDirectory"],
    });

    console.log("directories selected", result.filePaths[0]);
    return result.filePaths[0];
  });
}
