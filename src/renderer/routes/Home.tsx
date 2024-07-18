import React, { useState } from "react";
import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import DateForm from "@components/forms/DateForm";
import { format } from "date-fns";

const Home: React.FC = () => {
  const {
    settings: { darkTheme, flymaster, xcontest },
  } = useSettings();

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");

  const fetchFlyMasterIGCs = async () => {
    try {
      console.log("SELECTED GROUP FRONT", flymaster.selectedGroup);
      await window.scrappers.flymasterIGCs(
        flymaster.selectedGroup?.id,
        selectedDate,
        flymaster?.username,
        flymaster?.password,
        selectedFolderPath
      );
    } catch (error) {
      console.error("Error fetching Flymaster groups:", error);
    }
  };

  const fetchXcontestIGCs = async () => {
    const pilotId = "Mnel";

    try {
      const allXContestFlights = await window.scrappers.xcontestIGCs(
        xcontest?.username,
        xcontest?.password,
        selectedDate ? format(new Date(selectedDate), "dd.MM.yy") : "",
        pilotId,
        selectedFolderPath
      );
      console.log("ALL XCONTEST FLIGHTS", allXContestFlights);
    } catch (error) {
      console.error("Error fetching Xcontest IGCs:", error);
    }
  };

  const selectFolder = async () => {
    try {
      const filePath = await window.tracks.IGCsDirectory();
      console.log("Selected folder path:", filePath);
      setSelectedFolderPath(filePath);
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };

  return (
    <div id="application" className={`${darkTheme ? "dark" : ""}`}>
      <Configuration />
      <DateForm selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

      <button onClick={selectFolder}>Choose Folder</button>

      <div className="flex flex-col gap-8">
        <div className="flex flex-row gap-4">
          <button onClick={fetchFlyMasterIGCs}>Get Flymaster IGCs</button>
        </div>

        <div className="flex flex-row gap-4">
          <button onClick={fetchXcontestIGCs}>Get Xcontest IGCs</button>
        </div>

        <div className="mt-8">
          <h2>Extracted Files and Tracker Numbers:</h2>
          <table>
            <thead>
              <tr>
                <th>Pilot Name</th>
                <th>Tracker Number</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>PILOTNAME</td>
                <td>TRACKNUMBER</td>
                <td>Flymaster</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Home;
