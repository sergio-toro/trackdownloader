import { app, BrowserWindow } from "electron";
import path from "path";

import { registerTitlebarIpc } from "@main/window/titlebarIpc";
import registerScrappersIpc from "@main/scrappers/registerScrappersIpc";
import registerTracksIpc from "./tracks/registerTracksIpc";
// Electron Forge automatically creates these entry points
declare const SPLASH_WINDOW_WEBPACK_ENTRY: string;
declare const APP_WINDOW_WEBPACK_ENTRY: string;
declare const APP_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let appWindow: BrowserWindow;

/**
 * Register Inter Process Communication
 */
function registerMainIPC() {
  /**
   * Here you can assign IPC related codes for the application window
   * to Communicate asynchronously from the main process to renderer processes.
   */
  registerTitlebarIpc(appWindow);

  registerScrappersIpc();
  registerTracksIpc(appWindow);
}

/**
 * Create Application Window
 * @returns {BrowserWindow} Application Window Instance
 */
export async function createAppWindow(): Promise<BrowserWindow> {
  // Create new window instance
  appWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#202020",
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    icon: path.resolve("assets/images/app.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      preload: APP_WINDOW_PRELOAD_WEBPACK_ENTRY,
      sandbox: false,
      devTools: true,
    },
  });

  // README: Uncomment the line below to open dev tools
  appWindow.webContents.openDevTools();

  const splash = new BrowserWindow({
    width: 500,
    height: 410,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    focusable: false,
    movable: false,
  });

  // Load the index.html of the app window.
  appWindow.loadURL(APP_WINDOW_WEBPACK_ENTRY);

  // Show window when its ready to
  appWindow.on("ready-to-show", async () => {
    // wait 5 seconds with a promise before showing the app window
    await new Promise((resolve) => setTimeout(resolve, 5000));
    appWindow.show();
    appWindow.maximize();
    splash.destroy();
  });

  splash.loadURL(SPLASH_WINDOW_WEBPACK_ENTRY);

  // Register Inter Process Communication for main process
  registerMainIPC();

  // Close all windows when main window is closed
  appWindow.on("close", () => {
    appWindow = null;
    app.quit();
  });

  return appWindow;
}
