import React from "react";
import { createRoot } from "react-dom/client";

import landing from "./landing.png";

import "./styles.scss";

// Say something
console.log("[Track Downloader]: Renderer execution started");

// Application to Render
function MainApp() {
  return (
    <div id="container">
      <img alt="not found" className="landing" src={landing} />
      <p className="title">TrackDownloader</p>
      <p className="copy">Credits: Mireia Garcia, Sergio Toro © 2024</p>
    </div>
  );
}

// Render application in DOM
createRoot(document.getElementById("app")).render(<MainApp />);
