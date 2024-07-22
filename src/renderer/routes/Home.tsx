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
      console.error("Error fetching Flymaster IGCS:", error);
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
      const allXcontestTracks: XContestTrack[] = [];
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

          for (const track of xcontestTrack) {
            await window.tracks.downloadFile(track.igcUrl, selectedFolder);
            allXcontestTracks.push(track);
          }
        } catch (error) {
          console.error(`Error processing nickname ${pilot.xctrack}:`, error);
        }
      }
      const igcFiles = await window.tracks.listIGCs(selectedFolder);
      console.log("XC IGC FILES", igcFiles);
      // setIgcFiles(igcFiles);
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

  const fetchVolandooIGCs = async () => {
    const pilotUserNames = pilots.map((pilot) => pilot.volandoo!);
    console.log("PILOT USERNAMEs", pilotUserNames);

    try {
      for (const pilotUserName of pilotUserNames) {
        if (!pilotUserName) {
          console.log("No username found for pilot:", pilotUserName);
          continue;
        }
        const volandooIGCs = await window.scrappers.volandooIGCs(
          selectedDate,
          pilotUserName
        );
        console.log("PILOT USERNAME", pilotUserName);
        console.log("VOLANDOO IGCS", volandooIGCs);
        for (const igc of volandooIGCs) {
          await window.tracks.unzipFile(igc, selectedFolder);
        }
      }
    } catch (error) {
      console.error("Error fetching Volandoo IGCS:", error);
    }
  };

  const handleDeleteTrack = (igcUrl: string) => {
    setAllXcontestTracks((prevTracks) => {
      const updatedTracks = prevTracks.filter(
        (track) => track.igcUrl !== igcUrl
      );
      console.log("all after delete", updatedTracks);
      return updatedTracks;
    });
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
                  <th>Details</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {pilots.map((pilot, index) => {
                  const isFlymaster = parsedIgcIds.includes(pilot.id);
                  const xcontestPilotTracks = allXcontestTracks.filter(
                    (track) => track.pilotId === pilot.xctrack
                  );
                  const isXcontest = xcontestPilotTracks.length > 0;
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
                        {xcontestPilotTracks.length > 1 ? (
                          xcontestPilotTracks.map((track, i) => (
                            <div
                              key={i}
                              className="flex gap-3 items-center justify-center bg-red-400 p-2 "
                            >
                              <div className="flex flex-col items-start font-bold">
                                <p>
                                  Start time:{" "}
                                  <span className="font-normal">
                                    {track.startTime} h
                                  </span>
                                </p>
                                <p>
                                  Duration:{" "}
                                  <span className="font-normal">
                                    {track.duration}
                                  </span>
                                </p>
                              </div>

                              <button
                                onClick={() => handleDeleteTrack(track.igcUrl)}
                                className="ml-2 text-white bg-red-900 p-1 rounded-md"
                              >
                                Delete
                              </button>
                            </div>
                          ))
                        ) : xcontestPilotTracks.length === 1 ? (
                          <div className="flex gap-3 items-center justify-center  ">
                            <div className="flex flex-col items-start font-bold">
                              <p>
                                Start time:{" "}
                                <span className="font-normal">
                                  {xcontestPilotTracks[0].startTime} h
                                </span>
                              </p>
                              <p>
                                Duration:{" "}
                                <span className="font-normal">
                                  {xcontestPilotTracks[0].duration}
                                </span>
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleDeleteTrack(xcontestPilotTracks[0].igcUrl)
                              }
                              className="ml-2 text-white bg-red-900 p-1 rounded-md"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          "No track found"
                        )}
                      </td>
                      <td>Track Link</td>
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
