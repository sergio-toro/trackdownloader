import pie from "puppeteer-in-electron";
import { app, BrowserWindow } from "electron";
import puppeteer from "puppeteer-core";

export const getVolandooIGCs = async (date: string, pilotUsername: string) => {
  console.log("inside GET");

  try {
    // eslint-disable-next-line
    // @ts-ignore
    const browser = await pie.connect(app, puppeteer);

    const window = new BrowserWindow();
    const url = `https://volandoo.com/pilots/${pilotUsername}`;
    await window.loadURL(url);

    const page = await pie.getPage(browser, window);

    await page.waitForSelector("table.MuiTable-root tbody a tr");

    const flightsItems = await page.$$("table.MuiTable-root tbody > a");

    const pilotIGCs = [];

    for (const row of flightsItems) {
      const dateElement = await row.$("td > p > span");
      if (!dateElement) {
        continue;
      }
      const scrappedDate = await dateElement.evaluate((el) =>
        el.textContent.trim()
      );

      if (date !== scrappedDate) {
        continue;
      }

      const durationElement = await row.$("tr > td:nth-child(3)");
      const duration = await durationElement.evaluate((el) =>
        el.textContent.trim()
      );
      const detailsUrl = await row.evaluate((el) => el.href);

      const rowWindow = new BrowserWindow();
      await rowWindow.loadURL(detailsUrl);

      const rowPage = await pie.getPage(browser, rowWindow);

      console.log("WAITING");
      await rowPage.waitForSelector("div.MuiStack-root > a");
      const downloadLinkElement = await rowPage.$("div.MuiStack-root > a");
      const downloadLink = await downloadLinkElement.evaluate((el) => el.href);

      console.log("ELEMENT", scrappedDate, downloadLink);

      pilotIGCs.push({
        pilotUsername,
        igcUrl: downloadLink,
        date: scrappedDate,
        duration,
      });

      rowWindow.close();
    }

    console.log("pilotIGCs", pilotIGCs);

    window.close();

    return pilotIGCs;
  } catch (error) {
    console.error("Error in getVolandooIGCs:", error);
    throw error;
  }
};
