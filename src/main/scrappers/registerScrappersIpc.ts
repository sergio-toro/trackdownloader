import { ipcMain } from "electron";
import testScrapper from "@main/scrappers/testScrapper";

export default function registerScrappersIpc() {
  ipcMain.handle("scrapper-test", async (_, username) => {
    console.log("running cli", _, username);

    await testScrapper(username);

    return { success: true, exampleData: "example" };
  });
}
