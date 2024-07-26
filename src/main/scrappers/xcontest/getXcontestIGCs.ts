import { ElementHandle, Page, TimeoutError } from "puppeteer-core";
import getIGCUrl from "./getIGCUrl";

const extractTime = (timeString: string) => {
  return timeString.split("=")[0];
};

export const getXcontestIGCs = async (
  page: Page,
  date: string,
  pilotId: string
) => {
  try {
    await page.waitForSelector("div.XCslotPilotFlights table.XClist tr", {
      timeout: 7500,
    });

    const rows = await page.$$("div.XCslotPilotFlights table.XClist tr");
    const pilotIGCs = [];

    for (const row of rows) {
      const dateElement = await row.$("td[title*='submitted'] div.full");
      if (dateElement) {
        const dateValue = await page.evaluate(
          (el) => el.textContent.trim(),
          dateElement
        );
        const [scrapedDate, scrapedTime] = dateValue.split(" ");

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
              startTime: extractTime(scrapedTime),
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
    if (error instanceof TimeoutError) {
      console.error("Timeout waiting for selector:", error);
    } else {
      console.error("Error in getXcontestIGCs:", error);
    }
    throw error;
  }
};
