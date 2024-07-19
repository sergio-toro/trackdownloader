import { contextBridge, ipcRenderer } from "electron";

type FlymasterGroupsResponse = Array<{
  id: string;
  name: string;
}>;

type FlymasterIGCsResponse = Array<{
  selectedGroup: string;
  date: string;
}>;

type XcontestIGCsResponse = Array<{
  pilotId: string;
  igcUrl: string;

  date: string;
  startTime: string;
  duration: string;
}>;

export interface ScrapperMethods {
  test: (username: string) => Promise<void>;
  flymasterGroups: (
    username: string,
    password: string
  ) => Promise<FlymasterGroupsResponse>;
  flymasterIGCs: (
    selectedGroup: string,
    date: string,
    username: string,
    password: string
  ) => Promise<FlymasterIGCsResponse>;
  xcontestIGCs: (
    username: string,
    password: string,
    date: string,
    pilotId: string,
    pilotName: string
    // selectedFolderPath: string
  ) => Promise<XcontestIGCsResponse>;
}

const scrappers: ScrapperMethods = {
  test: async (username: string) =>
    ipcRenderer.invoke("scrapper-test", username),
  flymasterGroups: async (username: string, password: string) =>
    ipcRenderer.invoke("scrapper-flymaster-groups", username, password),
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
    pilotId: string,
    pilotName: string
  ) =>
    ipcRenderer.invoke(
      "get-xcontest-igcs-zip",
      username,
      password,
      date,
      pilotId,
      pilotName
    ),
};

contextBridge.exposeInMainWorld("scrappers", scrappers);
