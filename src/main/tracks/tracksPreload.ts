import { contextBridge, ipcRenderer } from "electron";

export interface TrackMethods {
  IGCsDirectory: () => Promise<string>;
}

const tracks: TrackMethods = {
  IGCsDirectory: async () => ipcRenderer.invoke("file-directory"),
};

contextBridge.exposeInMainWorld("tracks", tracks);
