import { ipcMain } from "electron";

import getFlymasterGroups from "./flymaster/getFlymasterGroups";
import { getFlymasterIGCs } from "./flymaster/getFlymasterIGCs";
import xcontestScraper from "./xcontest/xcontestScraper";
import { getVolandooIGCs } from "./volandoo/getVolandooIGC";

export default function registerScrappersIpc() {
  ipcMain.handle("scrapper-flymaster-groups", async (_, options) => {
    return await getFlymasterGroups(options);
  });
  ipcMain.handle("get-flymaster-igcs-zip", async (_, options) => {
    return await getFlymasterIGCs(options);
  });

  ipcMain.handle("get-xcontest-igcs-zip", async (_, options) => {
    return await xcontestScraper(options);
  });

  ipcMain.handle("get-volandoo-igcs", async (_, options) => {
    return await getVolandooIGCs(options);
  });
}
