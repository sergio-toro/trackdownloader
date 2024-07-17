import { format, isValid, parse } from "date-fns";
import { SelectedGroup } from "./flymasterScraper";
import pie from "puppeteer-in-electron";
import { BrowserWindow, app } from "electron";
import puppeteer from "puppeteer-core";
import doLoginAndTableSearch from "./doLoginAndTableSearch";
import { handleDownloadIGCs } from "@main/tracks/flymasterZipDownloader";

export const getFlymasterIGCs = async (
  selectedGroup: SelectedGroup,
  date: string,
  username: string,
  password: string,
  selectedFolderPath: string
) => {
  try {
    // eslint-disable-next-line
    // @ts-ignore
    const browser = await pie.connect(app, puppeteer);

    const window = new BrowserWindow();
    const url = "https://lt.flymaster.net/#";
    await window.loadURL(url);

    const page = await pie.getPage(browser, window);

    console.log(`Navigating to ${url}...`);

    await doLoginAndTableSearch(username, password, page);
    await page.waitForNetworkIdle();

    console.log("SELECTED GROUP BACK", selectedGroup);
    console.log("SELECTED FOLDER", selectedFolderPath);
    console.log("SELECTED DATE BACK", date);
    await page.waitForSelector("#groupstable", { timeout: 60000 });

    const rowSelector = `#groupstable tbody tr[id="${selectedGroup}"]`;
    const igcButtonSelector = `${rowSelector} button#igcGroup`;

    const igcButton = await page.waitForSelector(igcButtonSelector, {
      timeout: 60000,
    });

    if (igcButton) {
      await igcButton.click();
      console.log(`Clicked IGC button for group ID ${selectedGroup}.`);
    } else {
      throw new Error(`IGC button not found for group ID ${selectedGroup}.`);
    }

    await page.waitForNetworkIdle();

    const parsedDate = parse(date, "yyyy-MM-dd", new Date());
    if (!isValid(parsedDate)) {
      throw new Error(`Invalid date value: ${parsedDate}`);
    }

    const formattedDate = format(date, "yyyy-MM-dd");

    await page.evaluate(
      (selector, date) => {
        const dateInput = document.querySelector(selector) as HTMLInputElement;
        if (dateInput) {
          dateInput.removeAttribute("readonly");
          dateInput.value = date;
        } else {
          throw new Error(`Date input selector not found: ${selector}`);
        }
      },
      "#igcDate",
      formattedDate
    );

    console.log(`Date set to ${formattedDate}.`);
    await page.waitForNetworkIdle();

    const areIGCsGenerated = await page.$("#infoDiv");

    if (!areIGCsGenerated) {
      console.log("IGC not generated ");

      const generateIGCButton = await page.waitForSelector("#genIgcBtn");
      await generateIGCButton.click();
      console.log("Generate IGC button clicked");
    }

    console.log("IGC already generated ");
    await page.waitForNetworkIdle();

    const downloadZipButton = await page.waitForSelector(
      'a[onclick^="DoDownload"]',
      {
        timeout: 300000,
      }
    );
    const downloadLinkSelector = 'a[onclick^="DoDownload"]';
    await page.waitForSelector(downloadLinkSelector, { timeout: 300000 });

    const zipURL = await page.evaluate((selector) => {
      const link = document.querySelector(selector) as HTMLAnchorElement;
      if (link) {
        const onclickValue = link.getAttribute("onclick");
        const matches = onclickValue.match(/'(https?:\/\/[^']+)'/);
        if (matches && matches.length > 1) {
          return matches[1];
        } else {
          throw new Error(
            `URL not found in onclick attribute: ${onclickValue}`
          );
        }
      } else {
        throw new Error(`Download link not found using selector: ${selector}`);
      }
    }, downloadLinkSelector);

    console.log("Download URL:", zipURL);
    await downloadZipButton.click();

    console.log("Download btn clicked");

    await handleDownloadIGCs(zipURL, selectedFolderPath);
    return zipURL;
  } catch (error) {
    console.error("Error in getFlymasterIGCs:", error);
    throw error;
  }
};
