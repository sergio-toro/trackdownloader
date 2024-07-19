import { ipcMain } from "electron";

import getFlymasterGroups from "./flymaster/getFlymasterGroups";
import { getFlymasterIGCs } from "./flymaster/getFlymasterIGCs";
import xcontestScraper from "./xcontest/xcontestScraper";
import { getVolandooIGCs } from "./volandoo/getVolandooIGC";

export default function registerScrappersIpc() {
  ipcMain.handle("scrapper-flymaster-groups", async (_, username, password) => {
    console.log("running cli", _, username);

    return await getFlymasterGroups(username, password);
  });
  ipcMain.handle(
    "get-flymaster-igcs-zip",
    async (_, selectedGroup, date, username, password) => {
      return await getFlymasterIGCs(selectedGroup, date, username, password);
    }
  );

  ipcMain.handle(
    "get-xcontest-igcs-zip",
    async (_, username, password, date, pilotId) => {
      return await xcontestScraper(username, password, date, pilotId);
    }
  );

  ipcMain.handle("get-volandoo-igcs", async (_, date, pilotUsername) => {
    return await getVolandooIGCs(date, pilotUsername);
  });
}
