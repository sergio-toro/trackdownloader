import React from "react";
import { createRoot } from "react-dom/client";
import WindowFrame from "@renderer/window/WindowFrame";
import Application from "@renderer/Application";
import { SettingsProvider } from "@renderer/context/settingsContext";
import { TracksProvider } from "./context/tableTracksContext";

// Say something
console.log("[Track Downloader]: Renderer execution started");

// Application to Render
function MainApp() {
  return (
    <SettingsProvider>
      <TracksProvider>
        <WindowFrame title="Track Downloader">
          <Application />
        </WindowFrame>
      </TracksProvider>
    </SettingsProvider>
  );
}

// Render application in DOM
createRoot(document.getElementById("app")).render(<MainApp />);
