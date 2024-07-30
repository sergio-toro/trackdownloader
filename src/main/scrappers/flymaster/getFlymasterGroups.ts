import doLoginAndTableSearch from "./doLoginAndTableSearch";
import { getWindowAndPage } from "@main/scrappers/window";

export interface FlymasterGroup {
  id: string;
  name: string;
}

type Options = {
  username: string;
  password: string;
  debug?: boolean;
};

export default async function getFlymasterGroups({
  username,
  password,
  debug = false,
}: Options): Promise<FlymasterGroup[]> {
  try {
    const url = "https://lt.flymaster.net/#";

    const [window, page] = await getWindowAndPage(url, {
      show: debug,
      width: 800,
      height: 600,
    });

    await page.waitForNetworkIdle();

    console.log(`Navigating to ${url}...`);
    await doLoginAndTableSearch(username, password, page);
    await page.waitForNetworkIdle();

    const groups = await page.$$("#groupstable tbody tr");
    const flymasterGroups: FlymasterGroup[] = [];
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

        flymasterGroups.push({ id, name });
      }
    }
    console.log("Groups to select", flymasterGroups);

    window.close();
    return flymasterGroups;
  } catch (e) {
    console.log("getFlymasterGroups error:", e);
    throw e;
  }
}
