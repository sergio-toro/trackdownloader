import { useEffect, useState } from "react";
import { md5 } from "js-md5";
import { format, parseISO } from "date-fns";
import { chunkArray } from "@renderer/utils/array";
import { PilotsState, useSettings } from "@renderer/context/settingsContext";
import { useTableTracks } from "@renderer/context/tableTracksContext";
import { ListIGCsResponse } from "@main/tracks/listIGCs";

export interface ProgressState {
  visible: boolean;
  percent: number;
  detail: string | null;
}

export interface IgcFilesState {
  setErrorMessage: (value: ((prevState: string) => string) | string) => void;
  listIGCs: (folder: string) => Promise<void>;
  flymasterProgress: ProgressState;
  xcontestProgress: ProgressState;
  volandooProgress: ProgressState;
  selectFolder: (league: string) => Promise<void>;
  errorMessage: string;
  isListingDirectory: boolean;
  fetchFlyMasterIGCs: () => Promise<void>;
  fetchXcontestIGCs: (specificPilot?: PilotsState) => Promise<void>;
  fetchVolandooIGCs: (specificPilot?: PilotsState) => Promise<void>;
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
  const [temporalFolder, setTemporalFolder] = useState<string | null>(null);
  const {
    settings: { flymaster, xcontest, pilots, debug, leagues },
  } = useSettings();

  // Fetch temporal path from storage on mount
  useEffect(() => {
    window.scoring.getTemporalPath().then(setTemporalFolder);
  }, []);
  const {
    selectedDate,
    selectedFolders,
    notAttendedPilotIds,
    igcFiles,
    setIgcFiles,
    setSelectedFolders,
  } = useTableTracks();

  const pilotsWithTracksIds = new Set();

  for (const league of leagues) {
    igcFiles[league]?.validIgcs.forEach((track) =>
      pilotsWithTracksIds.add(track.pilotId)
    );
    igcFiles[league]?.invalidIgcs.forEach((track) =>
      pilotsWithTracksIds.add(track.pilotId)
    );
  }

  useEffect(() => {
    const listAllIGCs = async () => {
      try {
        setIsListingDirectory(true);
        await listIGCs();
        setIsListingDirectory(false);
      } catch (error) {
        console.error("Error listing IGCs for all leagues:", error);
      } finally {
        setIsListingDirectory(false);
      }
    };

    listAllIGCs();
  }, [selectedFolders, leagues]);

  const filterIgcsByLeague = async () => {
    try {
      if (!pilots || !temporalFolder) {
        console.error("Pilots or temporalFolder is not set.");
        return;
      }

      const igcFiles = await window.tracks.listIGCs(temporalFolder);
      for (const igcFile of igcFiles.validIgcs) {
        const [pilotIdStr] = igcFile.name.match(/(\d+)\.igc$/) || [];
        const pilotId = parseInt(pilotIdStr, 10);

        const pilot = pilots.find((p) => p.id === pilotId);
        if (!pilot) {
          console.warn(`No pilot found with id ${pilotId}`);
          continue;
        }

        const league = pilot.league;
        if (!league || !leagues.includes(league)) {
          console.warn(
            `No league found for pilot ${pilot.name} or league not in the list.`
          );
          continue;
        }

        const leagueFolder = selectedFolders[league];
        if (!leagueFolder) {
          console.warn(`No folder selected for league ${league}`);
          continue;
        }

        const sourcePath = `${temporalFolder}/${igcFile.name}`;
        const destinationPath = `${leagueFolder}/${igcFile.name}`;

        await window.tracks.moveFile(sourcePath, destinationPath);

        console.log(`Moved ${igcFile.name} to ${leagueFolder}`);
      }
    } catch (error) {
      console.error("Error filtering IGCs by league:", error);
    }
  };

  const validateInputs = () => {
    if (!selectedDate || !Object.keys(selectedFolders).length) {
      setErrorMessage("Please select a date and at least one folder.");
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
        percent: 2,
        detail: "Flymaster: Clearing temporary folder...",
      });
      await window.tracks.clearDirectory(temporalFolder);

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
      const fileName = "flymaster.zip";
      const filePath = `${temporalFolder}/${fileName}`;

      const zipPath = await window.tracks.downloadFile(zipURL, filePath);
      setFlymasterProgress({
        visible: true,
        percent: 75,
        detail: `Flymaster: Decompressing IGCs ZIP for temporal folder ${temporalFolder}...`,
      });
      await window.tracks.unzipFile(zipPath, temporalFolder);

      setFlymasterProgress({
        visible: true,
        percent: 90,
        detail: "Flymaster: Classifying IGCs by league ...",
      });
      await filterIgcsByLeague();
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
      pilotsToFetch = pilots.filter(
        (pilot) =>
          !pilotsWithTracksIds.has(Number(pilot.id)) &&
          Boolean(pilot.xcontest) &&
          Boolean(pilot.league) &&
          !notAttendedPilotIds.has(Number(pilot.id))
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
              selectedFolder: selectedFolders[pilot.league],
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
      const newIgcFiles: Record<string, ListIGCsResponse> = {};
      for (const league of leagues) {
        const selectedFolder = selectedFolders[league];
        if (selectedFolder) {
          newIgcFiles[league] = await window.tracks.listIGCs(selectedFolder);
        }
      }
      setIgcFiles(newIgcFiles);
    } catch (error) {
      console.error("Error listing IGCs for all leagues:", error);
    } finally {
      setIsListingDirectory(false);
    }
  };

  const selectFolder = async (league: string) => {
    try {
      const directory = await window.tracks.selectDirectory();
      setSelectedFolders((folders) => ({
        ...folders,
        [league]: directory,
      }));
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
      pilotsToFetch = pilots.filter(
        (pilot) =>
          !pilotsWithTracksIds.has(Number(pilot.id)) &&
          Boolean(pilot.volandoo) &&
          Boolean(pilot.league) &&
          !notAttendedPilotIds.has(Number(pilot.id))
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
        const formattedDate = format(parsedDate, "dd/MM/yyyy");

        // console.log("Volandoo Settings", {
        //   date: formattedDate,
        //   volandooId: pilot.volandoo,
        //   debug,
        // });

        const selectedFolder = selectedFolders[pilot.league];
        const pilotIGCs = await window.scrappers.volandooIGCs({
          date: formattedDate,
          volandooId: pilot.volandoo,
          debug,
        });

        for (const track of pilotIGCs) {
          const filePath = `${selectedFolder}/Volandoo ${pilot.name} - ${md5(`${track.date}-${track.duration}`)}.${pilot.id}.igc`;
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
    isListingDirectory,
    flymasterProgress,
    volandooProgress,
    xcontestProgress,
    errorMessage,
    setErrorMessage,
  };
};

export default useFetchIGCs;
