import { app, BrowserWindow } from "electron";
import { createAppWindow } from "./appWindow";
import pie from "puppeteer-in-electron";

const CDP_PORT = 9222;

async function main() {
  const isDev = !app.isPackaged;
  if (isDev) {
    console.log(`Enabling CDP on port ${CDP_PORT} for MCP server connection`);
  }

  try {
    // pie.initialize sets the remote-debugging-port internally
    // Pass the port to avoid conflicts
    await pie.initialize(app, CDP_PORT);
  } catch (e) {
    console.log("Error while initializing puppeteer in electron", e);
  }
}

main();

/** Handle creating/removing shortcuts on Windows when installing/uninstalling. */
if (require("electron-squirrel-startup")) {
  app.quit();
}

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on("ready", createAppWindow);

/**
 * Emitted when the application is activated. Various actions can
 * trigger this event, such as launching the application for the first time,
 * attempting to re-launch the application when it's already running,
 * or clicking on the application's dock or taskbar icon.
 */
app.on("activate", () => {
  /**
   * On OS X it's common to re-create a window in the app when the
   * dock icon is clicked and there are no other windows open.
   */
  if (BrowserWindow.getAllWindows().length === 0) {
    createAppWindow();
  }
});

/**
 * Emitted when all windows have been closed.
 */
app.on("window-all-closed", () => {
  /**
   * On OS X it is common for applications and their menu bar
   * to stay active until the user quits explicitly with Cmd + Q
   */
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * In this file you can include the rest of your app's specific main process code.
 * You can also put them in separate files and import them here.
 */
