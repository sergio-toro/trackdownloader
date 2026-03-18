import { TrackMethods } from "@main/tracks/tracksPreload";
import { ScrapperMethods } from "@main/scrappers/scrappersPreload";
import { TitlebarContextApi } from "@main/window/titlebarContext";
import { ScoringMethods } from "@main/scoring/ipc/scoringPreload";
import { SettingsMethods } from "@main/settings/settingsPreload";

declare global {
  interface Window {
    electron_window?: {
      titlebar: TitlebarContextApi;
    };
    scrappers: ScrapperMethods;
    tracks: TrackMethods;
    scoring: ScoringMethods;
    appSettings: SettingsMethods;
    app: {
      platform: NodeJS.Platform;
    };
  }
}
declare module "react" {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}
export {};
