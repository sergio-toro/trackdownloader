import { Browser } from 'puppeteer-core';
import { getFlymasterIGCs } from './getFlymasterIGCs';

export interface SelectedGroup {
  id: string;
  name: string;
}

export const flymasterScraper = {
  url: 'https://lt.flymaster.net/#',

  async scraper(browser: Browser, selectedGroupId: string, date: string) {
    let page;
    try {
      page = await browser.newPage();
      await page.setViewport({
        width: 1600,
        height: 1000,
        isMobile: false,
        isLandscape: true,
        hasTouch: false,
        deviceScaleFactor: 1,
      });
      console.log(`Navigating to ${this.url}...`);

      await page.goto(this.url);

      const loginLink = await page.waitForSelector('#liLogin a[href="#"]', {
        timeout: 60000,
      });
      console.log('Login link found. Clicking...');
      await loginLink.click();
      await page.waitForNetworkIdle();

      const emailInput = await page.waitForSelector('#log_email', {
        timeout: 60000,
      });

      console.log('Email input found. Typing email...');
      await emailInput.type('sergio.toro.castano@gmail.com');

      const passwordInput = await page.waitForSelector('#log_password', {
        timeout: 60000,
      });
      console.log('Password input found. Typing password...');
      await passwordInput.type('4QD93W6r@sT6sV8');

      await page.click('button.btn.btn-primary.btn-block.btn-login');
      console.log('Logged in successfully.');
      await page.waitForNetworkIdle();

      await page.click('#accountMenu');
      await page.click('#liMyGroups');
      await page.waitForNetworkIdle();

      await page.waitForSelector('#groupstable', { timeout: 60000 });

      const groups = await page.$$('#groupstable tbody tr');
      const groupsToSelect: SelectedGroup[] = [];

      for (const group of groups) {
        const idElement = await group.$('td.my_id');
        const nameElement = await group.$('td.my_name');

        if (idElement && nameElement) {
          const id = await page.evaluate(
            (el) => el.textContent.trim(),
            idElement,
          );
          const name = await page.evaluate(
            (el) => el.textContent.trim(),
            nameElement,
          );

          groupsToSelect.push({ id, name });
        }
      }
      console.log('Groups to select', groupsToSelect);

      const selectedGroup = groupsToSelect.find(
        (group) => group.id === selectedGroupId,
      );
      if (selectedGroup) {
        console.log('Selected group:', selectedGroup);

        await getFlymasterIGCs(page, selectedGroup, date);
      } else {
        console.log(`Group with ID ${selectedGroupId} not found.`);
      }
    } catch (error) {
      console.error('Error scraping flights:', error);
    } finally {
      if (page) {
        await page.close();
      }
    }
  },
};
