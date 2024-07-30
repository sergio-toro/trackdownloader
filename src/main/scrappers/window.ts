import { app, BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import puppeteer, { Page } from "puppeteer-core";
import pie from "puppeteer-in-electron";

export const SCRAPPER_WINDOW_SETTINGS: BrowserWindowConstructorOptions = {
  width: 400,
  height: 200,
  // width: 800,
  // height: 600,
  focusable: true,
  alwaysOnTop: false,
  opacity: 0.8,
  // webPreferences: {
  //   nodeIntegration: true,
  //   contextIsolation: false,
  // },
};

interface ScrapperWindowSettings extends BrowserWindowConstructorOptions {
  minimized?: boolean;
}

export function getNewBrowserWindow({
  // minimized = true,
  ...overrideSettings
}: ScrapperWindowSettings): BrowserWindow {
  const settings = {
    ...SCRAPPER_WINDOW_SETTINGS,
    ...overrideSettings,
  };
  const window = new BrowserWindow(settings);

  // if (minimized) {
  //   window.minimize();
  // }

  return window;
}

export async function getWindowAndPage(
  url: string,
  settings: ScrapperWindowSettings = {}
): Promise<[BrowserWindow, Page]> {
  // eslint-disable-next-line
  // @ts-ignore
  const browser = await pie.connect(app, puppeteer);

  const window = getNewBrowserWindow(settings);
  await window.loadURL(url);
  const page = await pie.getPage(browser, window);
  return [window, page];
}
