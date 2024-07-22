import React, { useEffect, useState } from "react";
import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import { format } from "date-fns";
import Card from "@components/layout/Card";
import Input from "@components/forms/Input";
import { useTableTracks } from "@renderer/context/tableTracksContext";

interface XContestTrack {
  pilotId: string;
  igcUrl: string;
  date: string;
  startTime: string;
  duration: string;
}

const Home: React.FC = () => {
  const {
    settings: { theme, flymaster, xcontest, pilots },
  } = useSettings();

  const {
    selectedDate,
    selectedFolder,
    igcFiles,
    // setIgcFiles,
    setSelectedDate,
    setSelectedFolder,
  } = useTableTracks();

  const [parsedIgcIds, setParsedIgcIds] = useState<string[]>([]);
  const [allXcontestTracks, setAllXcontestTracks] = useState<XContestTrack[]>(
    []
  );

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
        selectedFolder
      );
      const fileName = "flymaster.zip";
      const filePath = `${selectedFolder}/${fileName}`;
      const zipPath = await window.tracks.downloadFile(zipURL, filePath);
      await window.tracks.unzipFile(zipPath, selectedFolder);
      const igcFiles = await window.tracks.listIGCs(selectedFolder);

      console.log("IGC FILES", igcFiles);
      // setIgcFiles(igcFiles);
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

  const fetchXcontestIGCs = async () => {
    const pilotsWithNoTrack = pilots.filter(
      (pilot) => !parsedIgcIds.includes(pilot.id)
    );

    const xcontestPilots = pilotsWithNoTrack.filter(
      (pilot) => pilot.xctrack !== null
    );

    try {
      let allXcontestTracks: XContestTrack[] = [];
      for (const pilot of xcontestPilots) {
        try {
          const xcontestTrack = await window.scrappers.xcontestIGCs(
            xcontest?.username,
            xcontest?.password,
            selectedDate ? format(new Date(selectedDate), "dd.MM.yy") : "",
            pilot.xctrack!,
            pilot.id,
            pilot.name,
            selectedFolder
          );
          allXcontestTracks = [...allXcontestTracks, ...xcontestTrack];
          // const fileName = "xcontest.zip";

          // const filePath = `${selectedFolder}/${fileName}`;
          // xcontestTrack.forEach(async (track: string) => {
          //   const zipPath = await window.tracks.downloadFile(track, filePath);
          //   await window.tracks.unzipFile(zipPath, selectedFolder);
          // });

          // const igcFiles = await window.tracks.listIGCs(selectedFolder);
          // console.log("IGC FILES XCONTEST", igcFiles);
        } catch (error) {
          console.error(`Error processing nickname ${pilot.xctrack}:`, error);
        }
      }
      setAllXcontestTracks(allXcontestTracks);
      console.log("all XCONTEST TRACKS", allXcontestTracks);
    } catch (error) {
      console.error("Error fetching Xcontest IGCs:", error);
    }
  };

  const listIGCs = async () => {
    try {
      const igcFiles = await window.tracks.listIGCs(selectedFolder);
      console.log("IGC FILES", igcFiles);
      // setIgcFiles(igcFiles);
    } catch (error) {
      console.error("Error listing IGCs:", error);
    }
  };

  const selectFolder = async () => {
    try {
      const directory = await window.tracks.selectDirectory();
      setSelectedFolder(directory);
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
              {!selectedFolder ? "Select Folder" : "Change Folder"}
            </button>
            {selectedFolder && (
              <span className="text-sm text-gray-700 font-medium">
                {selectedFolder}
              </span>
            )}
          </div>
          <div className="flex gap-2 grow justify-end">
            <button onClick={listIGCs}>List IGCs</button>
            <button onClick={fetchFlyMasterIGCs}>Get Flymaster IGCs</button>
            <button onClick={fetchXcontestIGCs}>Get Xcontest IGCs</button>
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
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {pilots.map((pilot, index) => {
                  const isFlymaster = parsedIgcIds.includes(pilot.id);
                  const isXcontest = allXcontestTracks.some(
                    (track) => track.pilotId === pilot.xctrack
                  );
                  // console.log(isXcontest);
                  const source = isFlymaster
                    ? "Flymaster"
                    : isXcontest
                      ? "Xcontest"
                      : "Track not found";

                  return (
                    <tr
                      key={index}
                      className={
                        isFlymaster
                          ? "bg-green-200"
                          : isXcontest
                            ? "bg-orange-200"
                            : ""
                      }
                    >
                      <td>{pilot.id}</td>
                      <td>{pilot.name}</td>
                      <td>{source}</td>
                      <td>
                        <button onClick={fetchXcontestIGCs}>Track Link</button>
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
