import React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./routes/Home";
import CompetitionsList from "./routes/CompetitionsList";
import Competition from "./routes/Competition";
import "@styles/main.css";
import "@styles/app.scss";
import "react-datasheet/lib/react-datasheet.css";

const Application: React.FC = () => {
  return (
    <div>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/competitions" element={<CompetitionsList />} />
          <Route path="/competition/:competitionId" element={<Competition />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default Application;
