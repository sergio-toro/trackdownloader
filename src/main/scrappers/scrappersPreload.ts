import { contextBridge, ipcRenderer } from "electron";

type FlymasterGroupsResponse = Array<{
  id: string;
  name: string;
}>;

type FlymasterIGCsResponse = Array<{
  selectedGroup: string;
  date: string;
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
      "get-flymaster-igcs",
      selectedGroup,
      date,
      username,
      password
    ),
};

contextBridge.exposeInMainWorld("scrappers", scrappers);
