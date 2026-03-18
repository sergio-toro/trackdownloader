import { contextBridge, ipcRenderer } from "electron";
import type { PersistedSettings } from "./settingsFileManager";

export interface SettingsMethods {
  load: () => Promise<PersistedSettings>;
  save: (settings: PersistedSettings) => Promise<void>;
}

const settings: SettingsMethods = {
  load: () => ipcRenderer.invoke("settings-load"),
  save: (data) => ipcRenderer.invoke("settings-save", data),
};

contextBridge.exposeInMainWorld("appSettings", settings);
