import React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./routes/Home";
import Scoring from "./routes/Scoring";
import "@styles/main.css";
import "@styles/app.scss";
import "react-datasheet/lib/react-datasheet.css";

const Application: React.FC = () => {
  return (
    <div>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scoring" element={<Scoring />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default Application;
