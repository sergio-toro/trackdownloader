import { app, BrowserWindow } from "electron";
import puppeteer from "puppeteer-core";
import pie from "puppeteer-in-electron";
import { getXcontestIGCs } from "./getXcontestIGCs";
import { downloadFile } from "@main/tracks/downloadFile";
import { parse } from "date-fns";

export default async function xcontestScraper(
  username: string,
  password: string,
  date: string,
  xcontestId: string,
  pilotId: number,
  pilotName: string,
  selectedFolder: string
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

    const pilotUrl = `https://www.xcontest.org/world/en/pilots/detail:${xcontestId}`;
    console.log(`Navigating to ${pilotUrl}...`);

    await page.goto(pilotUrl, {
      waitUntil: ["domcontentloaded", "networkidle2"],
    });

    const flightDetails = await getXcontestIGCs(page, date, xcontestId);
    allXContestFlights.push(...flightDetails);

    // Get cookies of the page
    const cookies = await page.cookies();

    const downloadedFiles = [];
    const headers = {
      "upgrade-insecure-requests": "1",
      Referer: pilotUrl,
      "Referrer-Policy": "strict-origin-when-cross-origin",
      Host: "www.xcontest.org",
      cookie: cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; "),
    };

    for (const flight of flightDetails) {
      try {
        const parsedDate = parse(
          `${flight.date} ${flight.startTime}`,
          "dd.MM.yy HH:mm",
          new Date()
        );

        console.log("Parsed Date:", parsedDate);

        if (isNaN(parsedDate.getTime())) {
          throw new Error("Parsed date is invalid");
        }

        const fileName = `${selectedFolder}/XContest ${pilotName} - ${parsedDate.getTime()}.${pilotId}.igc`;

        console.log("Generated File Name:", fileName);

        const downloadedFile = await downloadFile(
          flight.igcUrl,
          fileName,
          headers
        );
        downloadedFiles.push(downloadedFile);
      } catch (error) {
        console.error(`Error processing flight ${flight.igcUrl}:`, error);
      }
    }

    console.log("Final PILOT IGCs:", allXContestFlights);
    window.close();

    return allXContestFlights;
  } catch (error) {
    console.error("Error scraping flights:", error);
  }
}
