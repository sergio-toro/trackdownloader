import { contextBridge, ipcRenderer } from "electron";
import type { ListIGCsResponse } from "@main/tracks/listIGCs";

export interface TrackMethods {
  selectDirectory: () => Promise<string>;
  downloadFile: (zipURL: string, filePath: string) => Promise<string>;
  unzipFile: (
    zipFilePath: string,
    outputDirectory: string
  ) => Promise<string[]>;
  listIGCs: (directory: string) => Promise<ListIGCsResponse>;
  deleteIGCs: (filePath: string) => Promise<ListIGCsResponse>;
  moveFile: (
    sourcePath: string,
    destinationPath: string
  ) => Promise<ListIGCsResponse>;
}

const tracks: TrackMethods = {
  selectDirectory: async () => ipcRenderer.invoke("track-select-directory"),
  downloadFile: async (fileUrl, filePath) =>
    ipcRenderer.invoke("track-download-file", fileUrl, filePath),
  unzipFile: async (filePath, outputDirectory) =>
    ipcRenderer.invoke("track-unzip-file", filePath, outputDirectory),
  listIGCs: async (directory) =>
    ipcRenderer.invoke("track-list-igcs", directory),
  deleteIGCs: async (directory) =>
    ipcRenderer.invoke("track-delete-igcs", directory),
  moveFile: async (sourcePath, destinationPath) =>
    ipcRenderer.invoke("track-move-igcs", sourcePath, destinationPath),
};

contextBridge.exposeInMainWorld("tracks", tracks);
