import React, { useEffect, useState } from "react";
import { chunkArray } from "@renderer/utils/array";

import Card from "./layout/Card";
import Input from "./forms/Input";
import { PilotsState, useSettings } from "@renderer/context/settingsContext";
import { useTableTracks } from "@renderer/context/tableTracksContext";
import { format, parseISO } from "date-fns";
import { ProgressState } from "@renderer/routes/Home";
import ScrapButton from "./buttons/ScrapButton";

interface DownloaderProps {
  setFlymasterProgress: (progress: ProgressState) => void;
  setXcontestProgress: (progress: ProgressState) => void;
  setVolandooProgress: (progress: ProgressState) => void;
  flymasterProgress: ProgressState;
  xcontestProgress: ProgressState;
  volandooProgress: ProgressState;
}
const Downloader: React.FC<DownloaderProps> = ({
  setFlymasterProgress,
  setXcontestProgress,
  setVolandooProgress,
  flymasterProgress,
  xcontestProgress,
  volandooProgress,
}) => {
  const {
    settings: { flymaster, xcontest, pilots },
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
  const [errorMessage, setErrorMessage] = useState("");
  useEffect(() => {
    if (selectedFolder) {
      listIGCs();
    }
  }, []);
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

    const pilotChunks = chunkArray(pilotsToFetch, 2);
    for (const [chunkIndex, chunk] of pilotChunks.entries()) {
      const pilotUsernames = chunk.map((pilot) => pilot.xctrack).join(", ");
      setXcontestProgress({
        visible: true,
        percent: Math.floor((chunkIndex / pilotChunks.length) * 100),
        detail: `XContest: Downloading "${pilotUsernames}" IGCs track...`,
      });
      try {
        await Promise.allSettled(
          chunk.map(async (pilot) =>
            window.scrappers.xcontestIGCs(
              xcontest?.username,
              xcontest?.password,
              selectedDate ? format(new Date(selectedDate), "dd.MM.yy") : "",
              pilot.xctrack!,
              pilot.id,
              pilot.name,
              selectedFolder
            )
          )
        );
      } catch (error) {
        console.error(`Error processing pilots ${pilotUsernames}:`, error);
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
    if (!validateInputs() || volandooProgress.visible) return;
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
        Boolean(pilot.volandoo)
      );
    }

    try {
      for (const [index, pilot] of pilotsToFetch.entries()) {
        setVolandooProgress({
          visible: true,
          percent: Math.floor((index / pilotsToFetch.length) * 100),
          detail: `Volandoo: Downloading "${pilot.volandoo}" IGCs tracks...`,
        });

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
      }
      setVolandooProgress({
        visible: true,
        percent: 99,
        detail: "Volandoo: Listing IGCs...",
      });

      await listIGCs();

      setVolandooProgress({
        visible: false,
        percent: 0,
        detail: null,
      });
    } catch (error) {
      setVolandooProgress({
        visible: false,
        percent: 0,
        detail: null,
      });
      console.error("Error fetching Volandoo IGCS:", error);
    }
  };

  return (
    <Card className="w-full" title="Download Tracks">
      <div className="flex flex-row justify-between ">
        <div className=" flex gap-12 items-center ">
          <Input
            mode="vertical"
            type="date"
            label="Select a date:"
            id="date"
            name="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <div className="flex flex-col px-8 items-start border-l-2 border-l-zinc-300  ">
            <button
              onClick={selectFolder}
              className="border-gray-300 font-semibold text-sm"
            >
              {!selectedFolder ? "Select Folder:" : "Change Folder:"}
            </button>
            {selectedFolder && (
              <span className="text-sm py-3 text-gray-700 ">
                {selectedFolder}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-row gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Get IGCS:</h2>
            <div className="flex flex-row gap-2">
              <ScrapButton
                label="FLYMASTER"
                onClick={fetchFlyMasterIGCs}
                gradientClass="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-900"
              />
              <ScrapButton
                label="XCONTEST"
                onClick={() => fetchXcontestIGCs()}
                gradientClass="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700"
              />
              <ScrapButton
                label="VOLANDOO"
                onClick={() => fetchVolandooIGCs()}
                gradientClass="bg-gradient-to-br from-purple-600 via-purple-800 to-[#342467]"
              />
              <ScrapButton
                label="List IGCs"
                onClick={listIGCs}
                gradientClass="bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800"
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-200 text-red-700 p-2 rounded-md mb-4 mt-6 ">
            {errorMessage}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Downloader;
