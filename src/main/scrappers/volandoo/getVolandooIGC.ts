import { TimeoutError } from "puppeteer-core";
import { getWindowAndPage } from "@main/scrappers/window";

type Options = {
  date: string;
  volandooId: string;
  debug?: boolean;
};

export const getVolandooIGCs = async ({ date, volandooId, debug }: Options) => {
  if (!volandooId) {
    console.error(`Volandoo ID is required, "${volandooId}" provided`);
    throw new Error("Volandoo ID is required");
  }

  console.log("SERVER getVolandooIGCs", { date, volandooId, debug });

  const url = `https://volandoo.com/pilots/${volandooId}`;
  const [window, page] = await getWindowAndPage(url, {
    show: debug,
  });

  try {
    try {
      await page.waitForSelector("table.MuiTable-root tbody tr", {
        timeout: 5000,
      });
    } catch (error) {
      if (error instanceof TimeoutError) {
        console.error("Timeout waiting for selector:", error);
        throw new Error(`TimeoutError: Failed to load page for ${volandooId}`);
      }
      throw error;
    }

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

      const [rowWindow, rowPage] = await getWindowAndPage(detailsUrl, {
        show: debug,
      });

      await rowPage.waitForSelector("div.MuiStack-root > a");
      const downloadLinkElement = await rowPage.$("div.MuiStack-root > a");
      const downloadLink = await downloadLinkElement.evaluate((el) => el.href);

      pilotIGCs.push({
        pilotUsername: volandooId,
        igcUrl: downloadLink,
        date: scrappedDate,
        duration,
      });

      rowWindow.close();
    }

    window.close();
    return pilotIGCs;
  } catch (error) {
    window.close();

    console.error("Error in getVolandooIGCs:", error);

    throw error;
  }
};
