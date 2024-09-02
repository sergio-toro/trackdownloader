import { TimeoutError } from "puppeteer-core";
import { getWindowAndPage } from "@main/scrappers/window";
import { format, parse } from "date-fns";

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

    const parsedDate = parse(date, "MM/dd/yyyy", new Date());
    const shortDate = format(parsedDate, "M/d/yyyy");

    for (const row of flightsItems) {
      const dateElement = await row.$("td > p > span");
      if (!dateElement) {
        continue;
      }

      const scrappedDate = await dateElement.evaluate((el) =>
        el.textContent.trim()
      );

      if (date !== scrappedDate && shortDate !== scrappedDate) {
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
      // OLD VERSION
      // await rowPage.waitForSelector("div.MuiStack-root > a");
      // const downloadLinkElement = await rowPage.$("div.MuiStack-root > a");
      // const downloadLink = await downloadLinkElement.evaluate((el) => el.href);

      // get __NEXT_DATA__ from page
      const nextData = await rowPage.evaluate(() => {
        return JSON.parse(document.querySelector("#__NEXT_DATA__").textContent);
      });

      let trackId = null;
      let flightId = null;
      if (nextData.props.pageProps.flight) {
        trackId = nextData.props.pageProps.flight.trackId;
        flightId = nextData.props.pageProps.flight.id;
      }

      if (nextData.props.pageProps.track) {
        trackId = nextData.props.pageProps.track.id;
        flightId = nextData.props.pageProps.track.flights[0].id;
      }

      if (!trackId || !flightId) {
        throw new Error(
          "Volandoo changed the page structure, trackId or flightId not found"
        );
      }

      pilotIGCs.push({
        pilotUsername: volandooId,
        igcUrl: `https://storage.googleapis.com/volandoo-abc00.appspot.com/tracks_2/${trackId}/${flightId}.igc`,
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
