import { format, isValid, parse } from "date-fns";
import { FlymasterGroup } from "./getFlymasterGroups";
import doLoginAndTableSearch from "./doLoginAndTableSearch";
import { getWindowAndPage } from "@main/scrappers/window";

export const getFlymasterIGCs = async (
  selectedGroup: FlymasterGroup,
  date: string,
  username: string,
  password: string
): Promise<string> => {
  try {
    const url = "https://lt.flymaster.net/#";
    const [window, page] = await getWindowAndPage(url, {
      width: 800,
      height: 600,
    });

    console.log(`Navigating to ${url}...`);
    await page.waitForNetworkIdle();

    await doLoginAndTableSearch(username, password, page);
    await page.waitForNetworkIdle();

    console.log("SELECTED GROUP BACK", selectedGroup);
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

    const infoDivElement = await page.$("#infoDiv");
    if (infoDivElement) {
      const areIGCsGenerated = await infoDivElement.evaluate((el) => {
        return !el.classList.contains("hidden");
      });

      if (!areIGCsGenerated) {
        console.log("IGC not generated ");

        const generateIGCButton = await page.waitForSelector("#genIgcBtn");
        await generateIGCButton.click();
        console.log("Generate IGC button clicked");
      } else {
        console.log("IGC already generated ");
      }
    }

    await page.waitForNetworkIdle();

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

    window.close();

    return zipURL;
  } catch (error) {
    console.error("Error in getFlymasterIGCs:", error);
    throw error;
  }
};
