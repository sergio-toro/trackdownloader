import React, { useState } from "react";

import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import DateForm from "@components/forms/DateForm";

const Home: React.FC = () => {
  const {
    settings: { darkTheme, flymaster },
  } = useSettings();

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");

  console.log("SELECTED DATE", selectedDate);

  const fetchFlyMasterIGCs = async () => {
    try {
      console.log("SELECTED GROUP FRONT", flymaster.selectedGroup);
      const { group } = await window.scrappers.flymasterIGCs(
        flymaster.selectedGroup?.id,
        selectedDate,
        flymaster?.username,
        flymaster?.password,
        selectedFolderPath
      );
      console.log("SELECTED GROUP FRONT", flymaster.selectedGroup.id);
      console.log("SELECTED DATE FRONT", selectedDate);
    } catch (error) {
      console.error("Error fetching Flymaster groups:", error);
    }
  };
  const selectFolder = async () => {
    const filePath = await window.tracks.IGCsDirectory();
    console.log(filePath);
    setSelectedFolderPath(filePath);
  };

  return (
    <div id="application" className={` ${darkTheme ? "dark" : ""}`}>
      <Configuration />
      <DateForm selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

      <button onClick={selectFolder}>Choose Folder</button>
      <div className="flex flex-col gap-8">
        <div className="flex flex-row gap-4">
          <button onClick={fetchFlyMasterIGCs}>Get IGCs</button>
        </div>
      </div>
    </div>
  );
};

export default Home;
