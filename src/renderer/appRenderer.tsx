import React from "react";
import { createRoot } from "react-dom/client";
import WindowFrame from "@renderer/window/WindowFrame";
import ErrorBoundary from "@components/ErrorBoundary";
import Application from "@renderer/Application";
import { SettingsProvider } from "@renderer/context/settingsContext";
import { TracksProvider } from "@renderer/context/tableTracksContext";
import { CompetitionProvider } from "@renderer/context/competitionContext";

// Say something
console.log("[Track Downloader]: Renderer execution started");

// Application to Render
function MainApp() {
  return (
    <SettingsProvider>
      <TracksProvider>
        <CompetitionProvider>
          <WindowFrame title="Track Downloader">
            <ErrorBoundary>
              <Application />
            </ErrorBoundary>
          </WindowFrame>
        </CompetitionProvider>
      </TracksProvider>
    </SettingsProvider>
  );
}

// Render application in DOM
createRoot(document.getElementById("app")).render(<MainApp />);
