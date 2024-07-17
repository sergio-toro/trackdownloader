import { ipcMain } from "electron";

import flymasterScraper from "./flymaster/flymasterScraper";
import { getFlymasterIGCs } from "./flymaster/getFlymasterIGCs";

export default function registerScrappersIpc() {
  ipcMain.handle("scrapper-flymaster-groups", async (_, username, password) => {
    console.log("running cli", _, username);

    const groups = await flymasterScraper(username, password);
    return groups;
  });
  ipcMain.handle(
    "get-flymaster-igcs",
    async (_, selectedGroup, date, username, password, selectedFolderPath) => {
      const IGCs = await getFlymasterIGCs(
        selectedGroup,
        date,
        username,
        password,
        selectedFolderPath
      );
      return IGCs;
    }
  );
}
