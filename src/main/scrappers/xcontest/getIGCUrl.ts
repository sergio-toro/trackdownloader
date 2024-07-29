import { ElementHandle } from "puppeteer-core";
import { getWindowAndPage } from "@main/scrappers/window";

export default async function getIGCUrl(detailsLink: string) {
  const url = detailsLink;
  const [window, page] = await getWindowAndPage(url);

  await page.waitForSelector("a[title='download tracklog in IGC format']", {
    timeout: 10000,
  });

  const igcLinkElement = (await page.$(
    "a[title='download tracklog in IGC format']"
  )) as ElementHandle<HTMLAnchorElement>;
  if (igcLinkElement) {
    const igcUrl = await page.evaluate((el) => el.href, igcLinkElement);
    // console.log(`Found IGC download link: ${igcUrl}`);
    window.close();

    return igcUrl;
  }
}
