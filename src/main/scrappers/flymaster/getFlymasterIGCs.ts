import { format, parse } from 'date-fns';
import { SelectedGroup } from './flymasterScraper';
import pie from 'puppeteer-in-electron';
import { BrowserWindow, app } from 'electron';
import puppeteer from 'puppeteer-core';
import doLoginAndTableSearch from './doLoginAndTableSearch';

export const getFlymasterIGCs = async (
  selectedGroup: SelectedGroup,
  date: string,
  username: string,
  password: string,
) => {
  try {
    // @ts-ignore
    const browser = await pie.connect(app, puppeteer);

    const window = new BrowserWindow();
    const url = `https://lt.flymaster.net/#`;
    await window.loadURL(url);

    const page = await pie.getPage(browser, window);

    console.log(`Navigating to ${url}...`);

    await doLoginAndTableSearch(username, password, page);

    console.log('SELECTED GROUP BACK', selectedGroup);
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

    const parsedDate = parse(date, 'dd.MM.yy', new Date());
    const formattedDate = format(parsedDate, 'yyyy-MM-dd');

    await page.evaluate(
      (selector, date) => {
        (document.querySelector(selector) as HTMLInputElement).removeAttribute(
          'readonly',
        );
        (document.querySelector(selector) as HTMLInputElement).value = date;
      },
      '#igcDate',
      formattedDate,
    );

    console.log(`Date set to ${formattedDate}.`);

    const generateIGCButton = await page.waitForSelector('#genIgcBtn');
    await generateIGCButton.click();
    console.log('Generate IGC button clicked');

    await page.waitForNetworkIdle();
  } catch (error) {
    console.error('Error in getFlymasterIGCs:', error);
    throw error;
  }
};
