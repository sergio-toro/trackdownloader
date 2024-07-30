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

export interface ScrapperMethods {
  flymasterGroups: (options: {
    username: string;
    password: string;
  }) => Promise<FlymasterGroupsResponse>;
  flymasterIGCs: (
    selectedGroup: string,
    date: string,
    username: string,
    password: string
  ) => Promise<string>;
  xcontestIGCs: (
    username: string,
    password: string,
    date: string,
    xcontestId: string,
    pilotId: number,
    pilotName: string,
    selectedFolder: string
  ) => Promise<XcontestIGCsResponse>;
  volandooIGCs: (
    date: string,
    pilotUsername: string
  ) => Promise<VolandooIGCsResponse>;
}

const scrappers: ScrapperMethods = {
  flymasterGroups: async (options) =>
    ipcRenderer.invoke("scrapper-flymaster-groups", options),
  flymasterIGCs: async (
    selectedGroup: string,
    date: string,
    username: string,
    password: string
  ) =>
    ipcRenderer.invoke(
      "get-flymaster-igcs-zip",
      selectedGroup,
      date,
      username,
      password
    ),
  xcontestIGCs: async (
    username: string,
    password: string,
    date: string,
    xcontestId: string,
    pilotId: number,
    pilotName: string,
    selectedFolder: string
  ) =>
    ipcRenderer.invoke(
      "get-xcontest-igcs-zip",
      username,
      password,
      date,
      xcontestId,
      pilotId,
      pilotName,
      selectedFolder
    ),
  volandooIGCs: async (date: string, pilotUsername: string) =>
    ipcRenderer.invoke("get-volandoo-igcs", date, pilotUsername),
};

contextBridge.exposeInMainWorld("scrappers", scrappers);
