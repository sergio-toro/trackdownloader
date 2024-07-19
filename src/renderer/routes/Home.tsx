import React, { useState } from "react";
import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import { format } from "date-fns";
import Card from "@components/layout/Card";
import Input from "@components/forms/Input";

const Home: React.FC = () => {
  const {
    settings: { darkTheme, flymaster, xcontest },
  } = useSettings();

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");

  const fetchFlyMasterIGCs = async () => {
    try {
      console.log("SELECTED GROUP FRONT", flymaster.selectedGroup);
      const zipURL = await window.scrappers.flymasterIGCs(
        flymaster.selectedGroup?.id,
        selectedDate,
        flymaster?.username,
        flymaster?.password,
        selectedFolderPath
      );
      const fileName = "flymaster.zip";
      const filePath = `${selectedFolderPath}/${fileName}`;
      const zipPath = await window.tracks.downloadFile(zipURL, filePath);
      await window.tracks.unzipFile(zipPath, selectedFolderPath);
      const igcFiles = await window.tracks.listIGCs(selectedFolderPath);

      console.log("IGC FILES", igcFiles);
      // trigger download
      // unzip
      // getListOfIGCs
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
      const directory = await window.tracks.selectDirectory();
      console.log("Selected folder path:", directory);
      setSelectedFolderPath(directory);
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };

  return (
    <div id="application" className={`${darkTheme ? "dark" : ""}`}>
      <Configuration />

      <Card className="w-full" title="Download Tracks">
        <div className="flex flex-row gap-4">
          <Input
            mode="inline"
            type="date"
            label="Select a date"
            id="date"
            name="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <div className="flex gap-2 items-center">
            <button onClick={selectFolder} className="border-gray-300">
              {!selectedFolderPath ? "Select Folder" : "Change Folder"}
            </button>
            {selectedFolderPath && (
              <span className="text-sm text-gray-700 font-medium">
                {selectedFolderPath}
              </span>
            )}
          </div>
          <div className="flex gap-2 grow justify-end">
            <button onClick={fetchFlyMasterIGCs}>Get Flymaster IGCs</button>
            <button onClick={fetchXcontestIGCs}>Get Xcontest IGCs</button>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-8">
        <div className="Home mt-8">
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
