import { BrowserWindow, app } from "electron";
import puppeteer from "puppeteer-core";
import pie from "puppeteer-in-electron";
import { getXcontestIGCs } from "./getXcontestIGCs";

export default async function xcontestScraper(
  username: string,
  password: string,
  date: string,
  pilotId: string
  //   selectedFolderPath: string
) {
  try {
    // eslint-disable-next-line
    // @ts-ignore
    const browser = await pie.connect(app, puppeteer);

    const window = new BrowserWindow({
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    const url = "https://www.xcontest.org/world/es/";
    await window.loadURL(url);

    const page = await pie.getPage(browser, window);

    console.log(`Navigating to ${url}...`);

    const isLoggedIn = await page.$('input[name="logout"]');
    if (!isLoggedIn) {
      await page.waitForSelector("#login-username", { timeout: 60000 });
      console.log("Login form loaded");

      await page.type("#login-username", username);
      await page.type("#login-password", password);

      await Promise.all([
        page.click("#login-persist_login"),
        page.click('input[value="::LogIN::"]'),
        page.waitForNavigation(),
      ]);

      console.log("Logged in successfully.");
    }

    const allXContestFlights = [];

    const pilotUrl = `https://www.xcontest.org/world/en/pilots/detail:${pilotId}`;
    console.log(`Navigating to ${pilotUrl}...`);

    await page.goto(pilotUrl, {
      waitUntil: ["domcontentloaded", "networkidle2"],
    });

    const flightDetails = await getXcontestIGCs(
      page,
      date,
      pilotId
      //   selectedFolderPath
    );
    allXContestFlights.push(...flightDetails);

    console.log("Final PILOT IGCs:", allXContestFlights);
    window.close();

    return allXContestFlights;
  } catch (error) {
    console.error("Error scraping flights:", error);
  }
}
