import React, { useEffect, useState } from "react";
import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import { format } from "date-fns";
import Card from "@components/layout/Card";
import Input from "@components/forms/Input";

const Home: React.FC = () => {
  const {
    settings: { theme, flymaster, xcontest, pilots },
  } = useSettings();

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [igcFiles, setIgcFiles] = useState<string[]>([]);
  const [parsedIgcIds, setParsedIgcIds] = useState<string[]>([]);

  useEffect(() => {
    if (igcFiles.length > 0) {
      const parsedIds = parseIgcFiles(igcFiles);
      setParsedIgcIds(parsedIds);
    }
  }, [igcFiles]);

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
      setIgcFiles(igcFiles);
    } catch (error) {
      console.error("Error fetching Flymaster groups:", error);
    }
  };

  const parseIgcFiles = (files: string[]) => {
    return files.map((file) => {
      const match = file.match(/\.(\d+)\.igc$/);

      if (match) {
        return match[1];
      }
      return "";
    });
  };

  console.log("PILOTS", pilots);
  console.log("PARSED IDS", parsedIgcIds);

  const fetchXcontestIGCs = async () => {
    const pilotsWithNoTrack = pilots.filter(
      (pilot) => !parsedIgcIds.includes(pilot.id)
    );

    const xcontestNicknames = pilotsWithNoTrack
      .filter((pilot) => pilot.xctrack !== null)
      .map((pilot) => pilot.xctrack!);

    console.log("Pilots with no track:", pilotsWithNoTrack);
    console.log("XContest nicknames:", xcontestNicknames);

    try {
      let allXcontestFiles: string[] = [];
      for (const nickname of xcontestNicknames) {
        const xcontestFiles = await window.scrappers.xcontestIGCs(
          xcontest?.username,
          xcontest?.password,
          selectedDate ? format(new Date(selectedDate), "dd.MM.yy") : "",
          nickname,
          selectedFolderPath
        );
        console.log(`XContest IGCs for ${nickname}:`, xcontestFiles);

        allXcontestFiles = [...allXcontestFiles, ...xcontestFiles];
        console.log("ALL XCONTEST FILES", allXcontestFiles);
      }
    } catch (error) {
      console.error("Error fetching Xcontest IGCs:", error);
    }
  };

  const fetchVolandooIGCs = async () => {
    const pilotUsername = "abdel";
    try {
      const allVolandooFlights = await window.scrappers.volandooIGCs(
        selectedDate ? format(new Date(selectedDate), "dd/MM/yyyy") : "",
        pilotUsername
      );
      console.log("ALL VOLANDOO FLIGHTS", allVolandooFlights);

      // TODO: Trigger download
      // TODO: List IGCs
    } catch (error) {
      console.error("Error fetching Volandoo IGCs:", error);
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
    <div id="application" className={theme}>
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
            <button onClick={() => fetchFlyMasterIGCs()}>
              Get Flymaster IGCs
            </button>
            <button onClick={() => fetchXcontestIGCs()}>
              Get Xcontest IGCs
            </button>
            <button onClick={fetchVolandooIGCs}>Get Volandoo IGCs</button>
          </div>
        </div>
      </Card>

      {pilots.length > 0 ? (
        <div className="flex flex-col gap-8">
          <div className="Home mt-8">
            <h2>Extracted Files and Tracker Numbers:</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pilot Name</th>
                  <th>Source</th>
                  <th>Find</th>
                </tr>
              </thead>
              <tbody>
                {pilots.map((pilot, index) => {
                  const source = parsedIgcIds.includes(pilot.id)
                    ? "Flymaster"
                    : "Track not found";
                  const isFlymaster = source === "Flymaster";

                  return (
                    <tr
                      key={index}
                      className={isFlymaster ? "bg-green-200" : ""}
                    >
                      <td>{pilot.id}</td>
                      <td>{pilot.name}</td>
                      <td>{source}</td>
                      <td>
                        {!isFlymaster && (
                          <button onClick={() => fetchXcontestIGCs()}>
                            Find in XContest
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <p>No extracted flights.</p>
          <p>Select a group, a date, and a folder.</p>
        </div>
      )}
    </div>
  );
};

export default Home;
