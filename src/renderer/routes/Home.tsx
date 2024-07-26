import React, { useState } from "react";
import Configuration from "@components/Configuration";
import { PilotsState, useSettings } from "@renderer/context/settingsContext";
import { format } from "date-fns";
import Card from "@components/layout/Card";
import Input from "@components/forms/Input";
import { useTableTracks } from "@renderer/context/tableTracksContext";
import { ListIGCsResponse } from "@main/tracks/listIGCs";

const Home: React.FC = () => {
  const {
    settings: { theme, flymaster, xcontest, pilots },
  } = useSettings();
  console.log("PILOTS", pilots);
  const {
    selectedDate,
    selectedFolder,
    igcFiles,
    setIgcFiles,
    setSelectedDate,
    setSelectedFolder,
  } = useTableTracks();
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
    if (!validateInputs()) return;
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
      const igcFilesResponse = await window.tracks.listIGCs(selectedFolder);

      console.log("IGC FILES", igcFiles);
      setIgcFiles(igcFilesResponse);
    } catch (error) {
      console.error("Error fetching Flymaster IGCS:", error);
    }
  };

  const fetchXcontestIGCs = async (specificPilot?: PilotsState) => {
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
        (pilot) => pilot.xctrack !== null
      );
    }

    try {
      for (const pilot of pilotsToFetch) {
        try {
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
      const igcFilesResponse = await window.tracks.listIGCs(selectedFolder);
      const uniqueValidIgcs = [
        ...igcFiles.validIgcs,
        ...igcFilesResponse.validIgcs.filter(
          (newFile) =>
            !igcFiles.validIgcs.some(
              (existingFile) => existingFile.name === newFile.name
            )
        ),
      ];

      const uniqueInvalidIgcs = [
        ...igcFiles.invalidIgcs,
        ...igcFilesResponse.invalidIgcs.filter(
          (newFile) =>
            !igcFiles.invalidIgcs.some(
              (existingFile) => existingFile.name === newFile.name
            )
        ),
      ];

      setIgcFiles({
        validIgcs: uniqueValidIgcs,
        invalidIgcs: uniqueInvalidIgcs,
      });
    } catch (error) {
      console.error("Error fetching Xcontest IGCs:", error);
    }
  };

  console.log("ALL", igcFiles);
  const listIGCs = async () => {
    try {
      const igcFilesResponse = await window.tracks.listIGCs(selectedFolder);
      setIgcFiles(igcFilesResponse);
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

  const fetchVolandooIGCs = async (specificPilot?: PilotsState) => {
    if (!validateInputs()) return;

    let pilotsToFetch;

    if (specificPilot) {
      pilotsToFetch = [specificPilot];
    } else {
      pilotsToFetch = pilots;
    }

    const pilotUserNames = pilotsToFetch.map((pilot) => pilot.volandoo!);
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
  console.log("COMBINED", combinedIgcFiles);
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
                  console.log("PILOT TRACKS", pilotTracks);

                  const isInvalid = pilotTracks.some(
                    (track) => track.isValid === false
                  );
                  const isFlymaster = pilotTracks.some(
                    (track) => track.source === "LiveTrack"
                  );
                  const isXcontest = pilotTracks.some(
                    (track) => track.source === "XContest"
                  );

                  const isVolandoo = pilotTracks.some(
                    (track) => track.source === "Volandoo"
                  );

                  const source = isFlymaster
                    ? "Flymaster"
                    : isXcontest
                      ? "XContest"
                      : isVolandoo
                        ? "Volandoo"
                        : "Track not found";

                  return (
                    <tr
                      key={index}
                      className={
                        isInvalid
                          ? "bg-red-200"
                          : isFlymaster
                            ? "bg-blue-200"
                            : isXcontest
                              ? "bg-orange-200"
                              : isVolandoo
                                ? "bg-violet-200"
                                : ""
                      }
                    >
                      <td>{pilot.id}</td>
                      <td>{pilot.name}</td>
                      <td>{source}</td>
                      <td>
                        <div className="flex flex-col justify-between gap-8">
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
                          pilotTracks.map((track, i) =>
                            "start" in track ? (
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
                                      {track.duration}
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
                            ) : (
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
                            )
                          )}
                      </td>
                      <td>
                        <div className="flex flex-col gap-6">
                          {pilotTracks.map((track) => (
                            <div
                              key={track.name}
                              className="flex flex-col mb-2"
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
