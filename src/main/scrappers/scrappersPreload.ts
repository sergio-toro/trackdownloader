import { contextBridge, ipcRenderer } from "electron";

type FlymasterGroupsResponse = Array<{
  id: string;
  name: string;
}>;

type XcontestIGCsResponse = Array<{
  pilotId: string;
  igcUrl: string;

  date: string;
  startTime: string;
  duration: string;
}>;
type VolandooIGCsResponse = Array<{
  pilotId: string;
  igcUrl: string;
  date: string;
  startTime: string;
  duration: string;
}>;

type BaseOptions = {
  debug?: boolean;
};

export interface ScrapperMethods {
  flymasterGroups: (
    options: BaseOptions & {
      username: string;
      password: string;
    }
  ) => Promise<FlymasterGroupsResponse>;
  flymasterIGCs: (
    options: BaseOptions & {
      selectedGroup: string;
      date: string;
      username: string;
      password: string;
    }
  ) => Promise<string>;
  xcontestIGCs: (
    options: BaseOptions & {
      username: string;
      password: string;
      date: string;
      xcontestId: string;
      pilotId: number;
      pilotName: string;
      selectedFolder: string;
    }
  ) => Promise<XcontestIGCsResponse>;
  volandooIGCs: (
    date: string,
    pilotUsername: string
  ) => Promise<VolandooIGCsResponse>;
}

const scrappers: ScrapperMethods = {
  flymasterGroups: async (options) =>
    ipcRenderer.invoke("scrapper-flymaster-groups", options),
  flymasterIGCs: async (options) =>
    ipcRenderer.invoke("get-flymaster-igcs-zip", options),
  xcontestIGCs: async (options) =>
    ipcRenderer.invoke("get-xcontest-igcs-zip", options),
  volandooIGCs: async (date: string, pilotUsername: string) =>
    ipcRenderer.invoke("get-volandoo-igcs", date, pilotUsername),
};

contextBridge.exposeInMainWorld("scrappers", scrappers);
