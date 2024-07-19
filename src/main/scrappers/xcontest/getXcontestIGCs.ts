import { ElementHandle, Page } from "puppeteer-core";
import getIGCUrl from "./getIGCUrl";

export const getXcontestIGCs = async (
  page: Page,
  date: string,
  pilotId: string
  //   selectedFolderPath: string
) => {
  console.log("inside GET");

  try {
    await page.waitForSelector("div.XCslotPilotFlights table.XClist tr", {
      timeout: 60000,
    });
    const rows = await page.$$("div.XCslotPilotFlights table.XClist tr");

    console.log("table xctr list found");
    console.log("ROWS length:", rows.length);

    const pilotIGCs = [];

    for (const row of rows) {
      const dateElement = await row.$("td[title*='submitted'] div.full");
      if (dateElement) {
        const dateValue = await page.evaluate(
          (el) => el.textContent.trim(),
          dateElement
        );
        const [scrapedDate, scrapedTime] = dateValue.split(" ");

        console.log(" DATE", date);
        console.log("SCRAPED DATE", scrapedDate);

        if (date === scrapedDate) {
          const durationElement = await row.$("td.dur strong span.d1");
          const duration = durationElement
            ? await page.evaluate(
                (el) => el.textContent.trim(),
                durationElement
              )
            : null;

          const detailsLinkElement = (await row.$(
            "a.detail[title='flight detail']"
          )) as ElementHandle<HTMLAnchorElement>;
          if (detailsLinkElement) {
            const detailsLink = await page.evaluate(
              (el) => el.href,
              detailsLinkElement
            );

            const igcUrl = await getIGCUrl(detailsLink);

            pilotIGCs.push({
              pilotId,
              igcUrl,
              date: scrapedDate,
              startTime: scrapedTime,
              duration: duration,
            });
          } else {
            console.error("Details link not found");
          }
        }
      } else {
        console.error("Date element not found");
      }
    }

    return pilotIGCs;
  } catch (error) {
    console.error("Error in getXcontestIGCs:", error);
    throw error;
  }
};
