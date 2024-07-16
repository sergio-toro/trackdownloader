import { ipcMain } from "electron";
import testScrapper from "@main/scrappers/testScrapper";

import flymasterScraper from "./flymaster/flymasterScraper";
import { getFlymasterIGCs } from "./flymaster/getFlymasterIGCs";

export default function registerScrappersIpc() {
  ipcMain.handle("scrapper-test", async (_, username) => {
    console.log("running cli", _, username);

    await testScrapper(username);

    return { success: true, exampleData: "example" };
  });
  ipcMain.handle("scrapper-flymaster-groups", async (_, username, password) => {
    console.log("running cli", _, username);

    const groups = await flymasterScraper(username, password);
    return groups;
  });
  ipcMain.handle(
    "get-flymaster-igcs",
    async (_, selectedGroup, date, username, password) => {
      const IGCs = await getFlymasterIGCs(
        selectedGroup,
        date,
        username,
        password
      );
      return IGCs;
    }
  );
}
