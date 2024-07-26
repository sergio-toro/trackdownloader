import pie from "puppeteer-in-electron";
import { app, BrowserWindow } from "electron";
import puppeteer, { TimeoutError } from "puppeteer-core";

export const getVolandooIGCs = async (date: string, volandooId: string) => {
  console.log("inside GET");

  if (!volandooId) {
    console.error(`Volandoo ID is required, "${volandooId}" provided`);
    throw new Error("Volandoo ID is required");
  }

  try {
    // eslint-disable-next-line
    // @ts-ignore
    const browser = await pie.connect(app, puppeteer);

    const window = new BrowserWindow();
    const url = `https://volandoo.com/pilots/${volandooId}`;
    await window.loadURL(url);

    const page = await pie.getPage(browser, window);

    try {
      await page.waitForSelector("table.MuiTable-root tbody tr", {
        timeout: 60000,
      });
    } catch (error) {
      if (error instanceof TimeoutError) {
        console.error("Timeout waiting for selector:", error);
        throw new Error(`TimeoutError: Failed to load page for ${volandooId}`);
      }
      throw error;
    }

    const flightsItems = await page.$$("table.MuiTable-root tbody > a");

    console.log("flight items", flightsItems);
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
        console.log(date, "dates doesnt match", scrappedDate);
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
        pilotUsername: volandooId,
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
    if (error instanceof TimeoutError) {
      console.error("Timeout waiting for selector:", error);
    } else {
      console.error("Error in getVolandooIGCs:", error);
    }
    throw error;
  }
};
