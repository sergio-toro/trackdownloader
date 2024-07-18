import React, { useState } from "react";

import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import DateForm from "@components/forms/DateForm";

const Home: React.FC = () => {
  const {
    settings: { darkTheme, flymaster },
  } = useSettings();

  const [selectedDate, setSelectedDate] = useState<string>("");

  console.log("SELECTED DATE", selectedDate);

  const fetchFlyMasterIGCs = async () => {
    try {
      console.log("SELECTED GROUP FRONT", flymaster.selectedGroup);
      await window.scrappers.flymasterIGCs(
        flymaster.selectedGroup?.id,
        selectedDate,
        flymaster?.username,
        flymaster?.password
      );
      console.log("SELECTED GROUP FRONT", flymaster.selectedGroup.id);
      console.log("SELECTED DATE FRONT", selectedDate);

      // setSelectedGroupId(group.id);
    } catch (error) {
      console.error("Error fetching Flymaster groups:", error);
    }
  };

  return (
    <div id="application" className={` ${darkTheme ? "dark" : ""}`}>
      <Configuration />
      <DateForm selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

      <div className="flex flex-col gap-8">
        <div className="flex flex-row gap-4">
          {/*<button onClick={fetchFlymasterGroups}>FIND FLYMASTER GROUPS</button>*/}
          <button onClick={fetchFlyMasterIGCs}>Get IGCs</button>
        </div>
      </div>
    </div>
  );
};

export default Home;
