import { useState } from "react";
import { format, parseISO } from "date-fns";
import { chunkArray } from "@renderer/utils/array";
import { PilotsState, useSettings } from "@renderer/context/settingsContext";
import { useTableTracks } from "@renderer/context/tableTracksContext";
export interface ProgressState {
  visible: boolean;
  percent: number;
  detail: string | null;
}

const useFetchIGCs = () => {
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
  const [volandooProgress, setVolandooProgress] = useState<ProgressState>({
    visible: false,
    percent: 0,
    detail: null,
  });

  const [isListingDirectory, setIsListingDirectory] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const {
    settings: { flymaster, xcontest, pilots, debug },
  } = useSettings();
  const {
    selectedDate,
    selectedFolder,
    igcFiles,
    setIgcFiles,
    setSelectedFolder,
  } = useTableTracks();

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
      const zipURL = await window.scrappers.flymasterIGCs({
        selectedGroup: flymaster.selectedGroup?.id,
        date: selectedDate,
        username: flymaster?.username,
        password: flymaster?.password,
        debug,
      });
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
        Boolean(pilot.xcontest)
      );
    }

    const pilotChunks = chunkArray(pilotsToFetch, 2);
    for (const [chunkIndex, chunk] of pilotChunks.entries()) {
      const pilotUsernames = chunk.map((pilot) => pilot.xcontest).join(", ");
      setXcontestProgress({
        visible: true,
        percent: Math.floor((chunkIndex / pilotChunks.length) * 100),
        detail: `XContest: Downloading "${pilotUsernames}" IGCs track...`,
      });
      try {
        await Promise.allSettled(
          chunk.map(async (pilot) =>
            window.scrappers.xcontestIGCs({
              username: xcontest?.username,
              password: xcontest?.password,
              date: selectedDate
                ? format(new Date(selectedDate), "dd.MM.yy")
                : "",
              xcontestId: pilot.xcontest!,
              pilotId: pilot.id,
              pilotName: pilot.name,
              selectedFolder: selectedFolder,
              debug,
            })
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

  return {
    fetchFlyMasterIGCs,
    fetchXcontestIGCs,
    fetchVolandooIGCs,
    selectFolder,
    listIGCs,
    flymasterProgress,
    volandooProgress,
    xcontestProgress,
    errorMessage,
    setErrorMessage,
  };
};

export default useFetchIGCs;
