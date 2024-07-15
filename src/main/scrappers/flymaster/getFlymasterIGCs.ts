import { Page } from 'puppeteer-core';
import { format, parse } from 'date-fns';
import { SelectedGroup } from './flymasterScraper';

export const getFlymasterIGCs = async (
  page: Page,
  selectedGroup: SelectedGroup,
  date: string,
) => {
  try {
    const { id } = selectedGroup;
    const rowSelector = `#groupstable tbody tr[id="${id}"]`;
    const igcButtonSelector = `${rowSelector} button#igcGroup`;

    const igcButton = await page.waitForSelector(igcButtonSelector, {
      timeout: 60000,
    });

    if (igcButton) {
      await igcButton.click();
      console.log(`Clicked IGC button for group ID ${id}.`);
    } else {
      throw new Error(`IGC button not found for group ID ${id}.`);
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
