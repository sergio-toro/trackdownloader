import pie from "puppeteer-in-electron";
import { BrowserWindow, app } from "electron";
import puppeteer from "puppeteer-core";
import doLoginAndTableSearch from "./doLoginAndTableSearch";

export interface SelectedGroup {
  id: string;
  name: string;
}

export default async function flymasterScraper(
  username: string,
  password: string
) {
  try {
    // eslint-disable-next-line
    // @ts-ignore
    const browser = await pie.connect(app, puppeteer);

    const window = new BrowserWindow();
    const url = "https://lt.flymaster.net/#";
    await window.loadURL(url);

    const page = await pie.getPage(browser, window);

    console.log(`Navigating to ${url}...`);
    await doLoginAndTableSearch(username, password, page);

    const groups = await page.$$("#groupstable tbody tr");
    const groupsToSelect: SelectedGroup[] = [];
    await page.waitForNetworkIdle();

    for (const group of groups) {
      const idElement = await group.$("td.my_id");
      const nameElement = await group.$("td.my_name");

      if (idElement && nameElement) {
        const id = await page.evaluate(
          (el) => el.textContent.trim(),
          idElement
        );
        const name = await page.evaluate(
          (el) => el.textContent.trim(),
          nameElement
        );

        groupsToSelect.push({ id, name });
      }
    }
    console.log("Groups to select", groupsToSelect);

    window.close();
    return groupsToSelect;
  } catch (e) {
    console.log("flymasterScraper error:", e);
    throw e;
  }
}
