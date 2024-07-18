import { BrowserWindow, app } from "electron";
import pie from "puppeteer-in-electron";
import puppeteer, { ElementHandle } from "puppeteer-core";

export default async function downloadIGC(detailsLink: string) {
  // eslint-disable-next-line
  // @ts-ignore
  const browser = await pie.connect(app, puppeteer);

  const window = new BrowserWindow();

  const url = detailsLink;
  await window.loadURL(url);

  const page = await pie.getPage(browser, window);

  console.log(`Navigating to ${url}...`);

  await page.waitForSelector("a[title='download tracklog in IGC format']", {
    timeout: 60000,
  });

  const igcLinkElement = (await page.$(
    "a[title='download tracklog in IGC format']"
  )) as ElementHandle<HTMLAnchorElement>;
  if (igcLinkElement) {
    const igcUrl = await page.evaluate((el) => el.href, igcLinkElement);
    console.log(`Found IGC download link: ${igcUrl}`);
    return igcUrl;
  }
}
