import  {BrowserWindow, app} from 'electron';
import pie from "puppeteer-in-electron";
import puppeteer from "puppeteer-core";


export default async function testScrapper(username:string) {
    try {
        // @ts-ignore
        const browser = await pie.connect(app, puppeteer);

        const window = new BrowserWindow();
        // README: uncomment this line to hide the window
        // window.hide();

        const url = `https://www.xcontest.org/world/es/pilotos/dettales:${username}`;
        await window.loadURL(url);

        const page = await pie.getPage(browser, window);

        await page.waitForSelector('.XCpilotTabs');
        console.log("URL", page.url());
        console.log('CONTENT', await page.content())
        window.close();
    } catch (e) {
        console.log('testScrapper error:', e)
    }
}