import { ipcMain } from "electron";
import { loadSettings, saveSettings } from "./settingsFileManager";

export default function registerSettingsIpc() {
  ipcMain.handle("settings-load", async () => {
    return await loadSettings();
  });

  ipcMain.handle("settings-save", async (_, settings) => {
    await saveSettings(settings);
  });
}
