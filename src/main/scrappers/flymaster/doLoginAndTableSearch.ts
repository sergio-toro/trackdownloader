import { Page } from "puppeteer-core";

export interface SelectedGroup {
  id: string;
  name: string;
}

export default async function doLoginAndTableSearch(
  username: string,
  password: string,
  page: Page
) {
  try {
    const isLoggedIn = await page.$("#accountMenu");

    if (!isLoggedIn) {
      const loginLink = await page.waitForSelector('#liLogin a[href="#"]', {
        timeout: 10000,
      });
      console.log("Login link found. Clicking...");
      await loginLink.click();
      await page.waitForNetworkIdle();

      const emailInput = await page.waitForSelector("#log_email", {
        timeout: 10000,
      });
      console.log("Email input found. Typing email...");
      await emailInput.type(username);

      const passwordInput = await page.waitForSelector("#log_password", {
        timeout: 10000,
      });
      console.log("Password input found. Typing password...");
      await passwordInput.type(password);

      await page.click("button.btn.btn-primary.btn-block.btn-login");
      console.log("Logged in successfully.");
      await page.waitForNetworkIdle();

      await page.waitForSelector("#accountMenu", {
        timeout: 60000,
        visible: true,
      });
    }

    await page.click("#accountMenu");
    await page.click("#liMyGroups");
    await page.waitForSelector("#groupstable tbody tr", { timeout: 10000 });

    console.log("Table loaded successfully.");
  } catch (e) {
    console.log("getFlymasterGroups error:", e);
    throw e;
  }
}
