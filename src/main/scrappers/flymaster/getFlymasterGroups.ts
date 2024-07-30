import doLoginAndTableSearch from "./doLoginAndTableSearch";
import { getWindowAndPage } from "@main/scrappers/window";

export interface SelectedGroup {
  id: string;
  name: string;
}

export default async function getFlymasterGroups(
  username: string,
  password: string
) {
  try {
    const url = "https://lt.flymaster.net/#";

    const [window, page] = await getWindowAndPage(url, {
      width: 800,
      height: 600,
    });

    await page.waitForNetworkIdle();

    console.log(`Navigating to ${url}...`);
    await doLoginAndTableSearch(username, password, page);
    await page.waitForNetworkIdle();

    const groups = await page.$$("#groupstable tbody tr");
    const groupsToSelect: SelectedGroup[] = [];
    await page.waitForNetworkIdle();

    for (const group of groups) {
      const idElement = await group.$("td.my_id");
      const nameElement = await group.$("td.my_name");

      if (idElement && nameElement) {
        const id = await page.evaluate(
          (el) => el.textContent.trim(),
          idElement
        );
        const name = await page.evaluate(
          (el) => el.textContent.trim(),
          nameElement
        );

        groupsToSelect.push({ id, name });
      }
    }
    console.log("Groups to select", groupsToSelect);

    window.close();
    return groupsToSelect;
  } catch (e) {
    console.log("getFlymasterGroups error:", e);
    throw e;
  }
}
