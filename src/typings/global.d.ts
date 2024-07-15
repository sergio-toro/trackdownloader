import type { ScrapperMethods } from "./src/scrappers/ScrapperMethods";
import { TitlebarContextApi } from "@main/window/titlebarContext";

declare global {
  interface Window {
    electron_window?: {
      titlebar: TitlebarContextApi;
    };
    scrappers: ScrapperMethods;
    app: {
      platform: NodeJS.Platform;
    };
  }
}

export {};
