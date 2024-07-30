import React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./routes/Home";
import "@styles/main.css";
import "@styles/app.scss";
import "react-datasheet/lib/react-datasheet.css";

const Application: React.FC = () => {
  return (
    <div>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default Application;
