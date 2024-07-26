import React, { useState } from "react";
import Configuration from "@components/Configuration";
import { PilotsState, useSettings } from "@renderer/context/settingsContext";
import { format, intervalToDuration, parseISO } from "date-fns";
import Card from "@components/layout/Card";
import Input from "@components/forms/Input";
import { useTableTracks } from "@renderer/context/tableTracksContext";
import { ListIGCsResponse } from "@main/tracks/listIGCs";
import ProgressLine from "@components/layout/ProgressLine";

interface ProgressState {
  visible: boolean;
  percent: number;
  detail: string | null;
}

const Home: React.FC = () => {
  const {
    settings: { theme, flymaster, xcontest, pilots },
  } = useSettings();
  const {
    selectedDate,
    selectedFolder,
    igcFiles,
    setIgcFiles,
    setSelectedDate,
    setSelectedFolder,
  } = useTableTracks();
  const [isListingDirectory, setIsListingDirectory] = useState(false);
  const [flymasterProgress, setFlymasterProgress] = useState<ProgressState>({
    visible: false,
    percent: 0,
    detail: null,
  });
  const [xcontestProgress, setXcontestProgress] = useState<ProgressState>({
    visible: false,
    percent: 0,
    detail: null,
  });
  // const [volandooProgress, setVolandooProgress] = useState<ProgressState>({
  //   visible: false,
  //   percent: 0,
  //   detail: null,
  // });
  const [errorMessage, setErrorMessage] = useState("");

  const validateInputs = () => {
    if (!selectedDate || !selectedFolder) {
      setErrorMessage("Please select a date and a folder.");
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const fetchFlyMasterIGCs = async () => {
    if (!validateInputs() || flymasterProgress.visible) return;
    try {
      setFlymasterProgress({
        visible: true,
        percent: 5,
        detail: "Flymaster: Creating IGCs ZIP...",
      });
      // console.log("SELECTED GROUP FRONT", flymaster.selectedGroup);
      const zipURL = await window.scrappers.flymasterIGCs(
        flymaster.selectedGroup?.id,
        selectedDate,
        flymaster?.username,
        flymaster?.password
      );
      setFlymasterProgress({
        visible: true,
        percent: 35,
        detail: "Flymaster: Downloading IGCs ZIP...",
      });
      const fileName = "flymaster.zip";
      const filePath = `${selectedFolder}/${fileName}`;

      const zipPath = await window.tracks.downloadFile(zipURL, filePath);
      setFlymasterProgress({
        visible: true,
        percent: 75,
        detail: "Flymaster: Decompressing IGCs ZIP...",
      });
      await window.tracks.unzipFile(zipPath, selectedFolder);

      setFlymasterProgress({
        visible: true,
        percent: 90,
        detail: "Flymaster: Listing IGCs...",
      });
      await listIGCs();

      setFlymasterProgress({
        visible: false,
        percent: 0,
        detail: null,
      });
    } catch (error) {
      setFlymasterProgress({
        visible: false,
        percent: 0,
        detail: null,
      });
      console.error("Error fetching Flymaster IGCS:", error);
    }
  };

  const fetchXcontestIGCs = async (specificPilot?: PilotsState) => {
    if (!validateInputs() || xcontestProgress.visible) return;

    let pilotsToFetch;

    if (specificPilot) {
      pilotsToFetch = [specificPilot];
    } else {
      const pilotsWithTracksIds = new Set([
        ...igcFiles.validIgcs.map((track) => track.pilotId),
        ...igcFiles.invalidIgcs.map((track) => track.pilotId),
      ]);
      const pilotsWithoutTrack = pilots.filter(
        (pilot) => !pilotsWithTracksIds.has(Number(pilot.id))
      );

      pilotsToFetch = pilotsWithoutTrack.filter((pilot) =>
        Boolean(pilot.xctrack)
      );
    }

    for (const [index, pilot] of pilotsToFetch.entries()) {
      try {
        setXcontestProgress({
          visible: true,
          percent: Math.floor((index / pilotsToFetch.length) * 100),
          detail: `Downloading "${pilot.xctrack}" XContest IGC track...`,
        });
        await window.scrappers.xcontestIGCs(
          xcontest?.username,
          xcontest?.password,
          selectedDate ? format(new Date(selectedDate), "dd.MM.yy") : "",
          pilot.xctrack!,
          pilot.id,
          pilot.name,
          selectedFolder
        );
      } catch (error) {
        console.error(`Error processing nickname ${pilot.xctrack}:`, error);
      }
    }
    setXcontestProgress({
      visible: true,
      percent: 99,
      detail: "Listing IGCs...",
    });
    await listIGCs();

    setXcontestProgress({
      visible: false,
      percent: 0,
      detail: null,
    });
  };

  const listIGCs = async () => {
    try {
      if (isListingDirectory) {
        console.warn("Already listing directory...");
        return;
      }
      setIsListingDirectory(true);
      const igcFilesResponse = await window.tracks.listIGCs(selectedFolder);
      setIsListingDirectory(false);
      setIgcFiles(igcFilesResponse);
    } catch (error) {
      setIsListingDirectory(false);
      console.error("Error listing IGCs:", error);
    }
  };

  const selectFolder = async () => {
    try {
      const directory = await window.tracks.selectDirectory();
      setSelectedFolder(directory);

      await listIGCs();
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };

  const fetchVolandooIGCs = async (specificPilot?: PilotsState) => {
    if (!validateInputs()) return;
    let pilotsToFetch;

    if (specificPilot) {
      pilotsToFetch = [specificPilot];
    } else {
      const pilotsWithTracksIds = new Set([
        ...igcFiles.validIgcs.map((track) => track.pilotId),
        ...igcFiles.invalidIgcs.map((track) => track.pilotId),
      ]);
      const pilotsWithoutTrack = pilots.filter(
        (pilot) => !pilotsWithTracksIds.has(Number(pilot.id))
      );

      pilotsToFetch = pilotsWithoutTrack.filter(
        (pilot) => pilot.volandoo !== null
      );
    }

    try {
      for (const pilot of pilotsToFetch) {
        if (!pilot) {
          console.log("No username found for pilot:", pilot);
          continue;
        }

        const parsedDate = parseISO(selectedDate);
        const formattedDate = format(parsedDate, "M/d/yyyy");
        const pilotIGCs = await window.scrappers.volandooIGCs(
          formattedDate,
          pilot.volandoo
        );
        console.log("PILOT USERNAME", pilot.volandoo);
        console.log("VOLANDOO IGCS", pilotIGCs);

        for (const track of pilotIGCs) {
          const filePath = `${selectedFolder}/Volandoo ${pilot.name} - ${track.date}${track.startTime}.${pilot.id}.igc`;
          try {
            await window.tracks.downloadFile(track.igcUrl, filePath);
          } catch (downloadError) {
            console.error(
              `Error downloading file: ${track.igcUrl} ${filePath}`,
              downloadError
            );
          }
        }

        await listIGCs();
      }
    } catch (error) {
      console.error("Error fetching Volandoo IGCS:", error);
    }
  };

  const deleteFlight = async (fileName: string, pilotName: string) => {
    try {
      if (
        window.confirm(
          `Are you sure you want to delete ${fileName} from ${pilotName}?`
        )
      ) {
        await window.tracks.deleteIGCs(`${selectedFolder}/${fileName}`);

        setIgcFiles((prevIgcFiles: ListIGCsResponse) => {
          const updatedValidIgcs = prevIgcFiles.validIgcs.filter(
            (file) => file.name !== fileName
          );
          const updatedInvalidIgcs = prevIgcFiles.invalidIgcs.filter(
            (file) => file.name !== fileName
          );

          return {
            validIgcs: updatedValidIgcs,
            invalidIgcs: updatedInvalidIgcs,
          };
        });
      }
    } catch (error) {
      console.error("Error deleting flight:", error);
    }
  };
  const combinedIgcFiles = [
    ...igcFiles.validIgcs.map((file) => ({ ...file, isValid: true })),
    ...igcFiles.invalidIgcs.map((file) => ({ ...file, isValid: false })),
  ];

  return (
    <div id="application" className={theme}>
      <Configuration />

      <Card className="w-full" title="Download Tracks">
        <div className="flex flex-row gap-6">
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
            <button
              onClick={selectFolder}
              className="border-gray-300 font-semibold"
            >
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
            <button onClick={() => fetchXcontestIGCs()}>
              Get Xcontest IGCs
            </button>
            <button onClick={() => fetchVolandooIGCs()}>
              Get Volandoo IGCs
            </button>
          </div>
        </div>
        {errorMessage && (
          <div className="bg-red-200 text-red-700 p-2 rounded-md mb-4 mt-6 ">
            {errorMessage}
          </div>
        )}
      </Card>

      {flymasterProgress.visible && (
        <ProgressLine
          detail={flymasterProgress.detail}
          percent={flymasterProgress.percent}
        />
      )}

      {xcontestProgress.visible && (
        <ProgressLine
          detail={xcontestProgress.detail}
          percent={xcontestProgress.percent}
        />
      )}

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
                  <th>Site</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Scrap</th>
                  <th>Links</th>
                </tr>
              </thead>
              <tbody>
                {pilots.map((pilot, index) => {
                  const pilotTracks = combinedIgcFiles.filter(
                    (track) => track.pilotId === Number(pilot.id)
                  );
                  // console.log("PILOT TRACKS", pilotTracks);

                  const isInvalid = pilotTracks.some(
                    (track) => track.isValid === false
                  );

                  const hasMoreThanOneFlight = pilotTracks.length > 1;

                  return (
                    <tr
                      key={index}
                      className={
                        isInvalid
                          ? "bg-red-200"
                          : hasMoreThanOneFlight
                            ? "bg-yellow-100"
                            : ""
                      }
                    >
                      <td>{pilot.id}</td>
                      <td>{pilot.name}</td>

                      <td>
                        <div className="flex flex-col justify-between gap-7">
                          {pilotTracks.map((track) => (
                            <div key={track.name}>{track.source}</div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col justify-between gap-7">
                          {pilotTracks.map((track) =>
                            "site" in track ? (
                              <div key={track.name}>{track.site}</div>
                            ) : (
                              <div key={track.name}>N/A</div>
                            )
                          )}
                        </div>
                      </td>
                      <td>
                        {pilotTracks.length > 0 &&
                          pilotTracks.map((track, i) => {
                            if (!("start" in track)) {
                              return (
                                <div
                                  key={i}
                                  className="flex justify-between items-center gap-3"
                                >
                                  <p>Error: {track.errorMessage}</p>
                                  <button
                                    className="bg-red-800 text-white p-1 rounded-md "
                                    onClick={() =>
                                      deleteFlight(
                                        track.name,
                                        String(track.pilotId)
                                      )
                                    }
                                  >
                                    Delete
                                  </button>
                                </div>
                              );
                            }
                            const trackDuration = intervalToDuration({
                              start: new Date(track.start.timestamp),
                              end: new Date(track.end.timestamp),
                            });
                            return (
                              <div
                                key={i}
                                className="flex justify-between items-center mt-2 mb-2  "
                              >
                                <div className="flex flex-col items-start font-bold ">
                                  <p>
                                    Start Time:{" "}
                                    <span className="font-normal">
                                      {format(track.start.time, "HH:mm")} h
                                    </span>
                                  </p>
                                  <p>
                                    Duration:{" "}
                                    <span className="font-normal">
                                      {trackDuration.hours > 0 && (
                                        <>{trackDuration.hours} h</>
                                      )}

                                      {trackDuration.minutes > 0 && (
                                        <>{trackDuration.minutes} min</>
                                      )}
                                    </span>{" "}
                                  </p>
                                </div>

                                <button
                                  className="bg-red-800 text-white p-1 rounded-md "
                                  onClick={() =>
                                    deleteFlight(track.name, track.pilotName)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            );
                          })}
                      </td>
                      <td>
                        <div className="flex flex-col gap-5">
                          {pilotTracks.map((track) => (
                            <div
                              key={track.name}
                              className="flex flex-col mt-1 mb-1"
                            >
                              <div>
                                <p>{track.isValid ? "Valid" : "Invalid"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => fetchXcontestIGCs(pilot)}
                            className="bg-orange-800 text-white p-1 rounded-md "
                          >
                            XContest
                          </button>
                          <button
                            onClick={() => fetchVolandooIGCs(pilot)}
                            className="bg-purple-800 text-white p-1 rounded-md "
                          >
                            Volandoo
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-3">
                          <a
                            href={`https://www.xcontest.org/world/en/pilots/detail/${pilot.xctrack}`}
                            className=" font-bold underline  "
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            XContest
                          </a>
                          <a
                            href={`https://volandoo.com/pilots/${pilot.volandoo}`}
                            className=" font-bold underline "
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Volandoo
                          </a>
                        </div>
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
