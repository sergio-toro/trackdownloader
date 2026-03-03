/**
 * Hook for downloading IGC tracks in competition context
 *
 * Orchestrates track downloads from Flymaster, XContest, and Volandoo
 * for competition tasks with auto-association to participant taskTracks.
 */

import { useState, useCallback, useRef } from "react";
import { md5 } from "js-md5";
import { format, parseISO } from "date-fns";
import { chunkArray } from "@renderer/utils/array";
import { useSettings } from "@renderer/context/settingsContext";
import type { Participant } from "@main/scoring/types";

export interface ProgressState {
  visible: boolean;
  percent: number;
  detail: string | null;
}

export type DownloadStatus =
  | "pending"
  | "downloading"
  | "success"
  | "error"
  | "no_track";

export interface PilotDownloadStatus {
  participantId: number;
  source: "xcontest" | "volandoo" | "flymaster" | null;
  status: DownloadStatus;
  igcPath?: string;
  error?: string;
}

export type DownloadAllPhase = "flymaster" | "xcontest" | "volandoo" | null;

export interface UseCompetitionDownloadOptions {
  competitionId: string;
  taskId: string;
  taskDate: string;
  participants: Participant[];
  onTrackDownloaded: (participantId: number, igcPath: string) => Promise<void>;
}

export interface UseCompetitionDownloadReturn {
  downloadXcontest: (participantIds: number[]) => Promise<void>;
  downloadVolandoo: (participantIds: number[]) => Promise<void>;
  downloadFlymaster: (
    participantIds: number[],
    groupId: string
  ) => Promise<void>;
  downloadAll: (participantIds: number[], groupId: string) => Promise<void>;
  xcontestProgress: ProgressState;
  volandooProgress: ProgressState;
  flymasterProgress: ProgressState;
  downloadStatus: Map<number, PilotDownloadStatus>;
  downloadAllPhase: DownloadAllPhase;
  isDownloading: boolean;
  errorMessage: string;
  cancelDownload: () => void;
}

const initialProgressState: ProgressState = {
  visible: false,
  percent: 0,
  detail: null,
};

export function useCompetitionDownload(
  options: UseCompetitionDownloadOptions
): UseCompetitionDownloadReturn {
  const { competitionId, taskId, taskDate, participants, onTrackDownloaded } =
    options;

  const [xcontestProgress, setXcontestProgress] =
    useState<ProgressState>(initialProgressState);
  const [volandooProgress, setVolandooProgress] =
    useState<ProgressState>(initialProgressState);
  const [flymasterProgress, setFlymasterProgress] =
    useState<ProgressState>(initialProgressState);
  const [downloadStatus, setDownloadStatus] = useState<
    Map<number, PilotDownloadStatus>
  >(new Map());
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadAllPhase, setDownloadAllPhase] =
    useState<DownloadAllPhase>(null);

  const cancelledRef = useRef(false);
  const downloadStatusRef = useRef<Map<number, PilotDownloadStatus>>(new Map());

  const {
    settings: { flymaster, xcontest, debug },
  } = useSettings();

  const updatePilotStatus = useCallback(
    (participantId: number, updates: Partial<PilotDownloadStatus>) => {
      setDownloadStatus((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(participantId) || {
          participantId,
          source: null,
          status: "pending" as DownloadStatus,
        };
        newMap.set(participantId, { ...existing, ...updates });
        downloadStatusRef.current = newMap;
        return newMap;
      });
    },
    []
  );

  const cancelDownload = useCallback(() => {
    cancelledRef.current = true;
    setIsDownloading(false);
    setDownloadAllPhase(null);
    setXcontestProgress(initialProgressState);
    setVolandooProgress(initialProgressState);
    setFlymasterProgress(initialProgressState);
  }, []);

  // --- Core download helpers (no lifecycle management) ---

  const _flymasterCore = useCallback(
    async (participantIds: number[], groupId: string, igcFolder: string) => {
      const temporalFolder = await window.scoring.getTemporalPath();

      const selectedParticipants = participants.filter((p) =>
        participantIds.includes(p.id)
      );
      for (const participant of selectedParticipants) {
        updatePilotStatus(participant.id, {
          source: "flymaster",
          status: "pending",
        });
      }

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

      const formattedDate = format(parseISO(taskDate), "yyyy-MM-dd");

      const zipURL = await window.scrappers.flymasterIGCs({
        selectedGroup: groupId,
        date: formattedDate,
        username: flymaster!.username,
        password: flymaster!.password,
        debug,
      });

      setFlymasterProgress({
        visible: true,
        percent: 50,
        detail: "Flymaster: Downloading ZIP...",
      });

      const zipPath = `${temporalFolder}/flymaster.zip`;
      await window.tracks.downloadFile(zipURL, zipPath);

      setFlymasterProgress({
        visible: true,
        percent: 70,
        detail: "Flymaster: Extracting IGCs...",
      });
      await window.tracks.unzipFile(zipPath, temporalFolder);

      setFlymasterProgress({
        visible: true,
        percent: 85,
        detail: "Flymaster: Matching and moving IGCs...",
      });

      const extractedIgcs = await window.tracks.listIGCs(temporalFolder);
      const selectedIds = new Set(participantIds);

      for (const igcFile of extractedIgcs.validIgcs) {
        const match = igcFile.name.match(/\.(\d+)\.igc$/);
        if (!match) continue;

        const pilotId = parseInt(match[1], 10);
        if (!selectedIds.has(pilotId)) continue;

        const participant = selectedParticipants.find((p) => p.id === pilotId);
        if (!participant) continue;

        updatePilotStatus(pilotId, { status: "downloading" });

        try {
          const sourcePath = `${temporalFolder}/${igcFile.name}`;
          const destPath = `${igcFolder}/${igcFile.name}`;

          await window.tracks.moveFile(sourcePath, destPath);

          updatePilotStatus(pilotId, {
            status: "success",
            igcPath: destPath,
          });
          await onTrackDownloaded(pilotId, destPath);
        } catch (err) {
          updatePilotStatus(pilotId, {
            status: "error",
            error: err instanceof Error ? err.message : "Move failed",
          });
        }
      }

      // Mark remaining participants as no_track
      for (const participant of selectedParticipants) {
        const status = downloadStatusRef.current.get(participant.id);
        if (!status || status.status === "pending") {
          updatePilotStatus(participant.id, {
            status: "no_track",
            error: "No track found in Flymaster download",
          });
        }
      }
    },
    [
      flymaster,
      taskDate,
      participants,
      debug,
      updatePilotStatus,
      onTrackDownloaded,
    ]
  );

  const _xcontestCore = useCallback(
    async (participantIds: number[], igcFolder: string) => {
      const pilotsToDownload = participants.filter(
        (p) => participantIds.includes(p.id) && p.xcontest
      );

      for (const participant of pilotsToDownload) {
        updatePilotStatus(participant.id, {
          source: "xcontest",
          status: "pending",
        });
      }

      const formattedDate = format(parseISO(taskDate), "dd.MM.yy");

      const pilotChunks = chunkArray(pilotsToDownload, 2);
      for (const [chunkIndex, chunk] of pilotChunks.entries()) {
        if (cancelledRef.current) break;

        const pilotNames = chunk.map((p) => p.name).join(", ");
        setXcontestProgress({
          visible: true,
          percent: Math.floor((chunkIndex / pilotChunks.length) * 100),
          detail: `XContest: Downloading ${pilotNames}...`,
        });

        for (const participant of chunk) {
          updatePilotStatus(participant.id, { status: "downloading" });
        }

        await Promise.allSettled(
          chunk.map(async (participant) => {
            if (cancelledRef.current) return;

            try {
              await window.scrappers.xcontestIGCs({
                username: xcontest!.username,
                password: xcontest!.password,
                date: formattedDate,
                xcontestId: participant.xcontest!,
                pilotId: participant.id,
                pilotName: participant.name,
                selectedFolder: igcFolder,
                debug,
              });

              const igcFiles = await window.tracks.listIGCs(igcFolder);
              const downloadedFile = igcFiles.validIgcs.find((f) =>
                f.name.includes(`.${participant.id}.igc`)
              );

              if (downloadedFile) {
                const igcPath = `${igcFolder}/${downloadedFile.name}`;
                updatePilotStatus(participant.id, {
                  status: "success",
                  igcPath,
                });
                await onTrackDownloaded(participant.id, igcPath);
              } else {
                updatePilotStatus(participant.id, {
                  status: "no_track",
                  error: "No track found for this date",
                });
              }
            } catch (err) {
              updatePilotStatus(participant.id, {
                status: "error",
                error: err instanceof Error ? err.message : "Download failed",
              });
            }
          })
        );
      }
    },
    [
      xcontest,
      taskDate,
      participants,
      debug,
      updatePilotStatus,
      onTrackDownloaded,
    ]
  );

  const _volandooCore = useCallback(
    async (participantIds: number[], igcFolder: string) => {
      const pilotsToDownload = participants.filter(
        (p) => participantIds.includes(p.id) && p.volandoo
      );

      for (const participant of pilotsToDownload) {
        updatePilotStatus(participant.id, {
          source: "volandoo",
          status: "pending",
        });
      }

      const formattedDate = format(parseISO(taskDate), "dd/MM/yyyy");

      for (const [index, participant] of pilotsToDownload.entries()) {
        if (cancelledRef.current) break;

        setVolandooProgress({
          visible: true,
          percent: Math.floor((index / pilotsToDownload.length) * 100),
          detail: `Volandoo: Downloading ${participant.name}...`,
        });

        updatePilotStatus(participant.id, { status: "downloading" });

        try {
          const pilotIGCs = await window.scrappers.volandooIGCs({
            date: formattedDate,
            volandooId: participant.volandoo!,
            debug,
          });

          if (pilotIGCs.length === 0) {
            updatePilotStatus(participant.id, {
              status: "no_track",
              error: "No track found for this date",
            });
            continue;
          }

          const track = pilotIGCs[0];
          const fileName = `Volandoo ${participant.name} - ${md5(`${track.date}-${track.duration}`)}.${participant.id}.igc`;
          const filePath = `${igcFolder}/${fileName}`;

          await window.tracks.downloadFile(track.igcUrl, filePath);

          updatePilotStatus(participant.id, {
            status: "success",
            igcPath: filePath,
          });
          await onTrackDownloaded(participant.id, filePath);
        } catch (err) {
          updatePilotStatus(participant.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Download failed",
          });
        }
      }
    },
    [taskDate, participants, debug, updatePilotStatus, onTrackDownloaded]
  );

  // --- Public download functions ---

  const downloadXcontest = useCallback(
    async (participantIds: number[]) => {
      if (isDownloading) return;
      if (!xcontest?.username || !xcontest?.password) {
        setErrorMessage("XContest credentials not configured");
        return;
      }

      cancelledRef.current = false;
      setIsDownloading(true);
      setErrorMessage("");

      try {
        const igcFolder = await window.scoring.getCompetitionIgcFolder(
          competitionId,
          taskId
        );
        await _xcontestCore(participantIds, igcFolder);
      } catch (error) {
        console.error("Error downloading XContest IGCs:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "XContest download failed"
        );
      } finally {
        setXcontestProgress(initialProgressState);
        setIsDownloading(false);
      }
    },
    [isDownloading, xcontest, competitionId, taskId, _xcontestCore]
  );

  const downloadVolandoo = useCallback(
    async (participantIds: number[]) => {
      if (isDownloading) return;

      cancelledRef.current = false;
      setIsDownloading(true);
      setErrorMessage("");

      try {
        const igcFolder = await window.scoring.getCompetitionIgcFolder(
          competitionId,
          taskId
        );
        await _volandooCore(participantIds, igcFolder);
      } catch (error) {
        console.error("Error downloading Volandoo IGCs:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Volandoo download failed"
        );
      } finally {
        setVolandooProgress(initialProgressState);
        setIsDownloading(false);
      }
    },
    [isDownloading, competitionId, taskId, _volandooCore]
  );

  const downloadFlymaster = useCallback(
    async (participantIds: number[], groupId: string) => {
      if (isDownloading) return;
      if (!flymaster?.username || !flymaster?.password) {
        setErrorMessage("Flymaster credentials not configured");
        return;
      }

      cancelledRef.current = false;
      setIsDownloading(true);
      setErrorMessage("");

      try {
        const igcFolder = await window.scoring.getCompetitionIgcFolder(
          competitionId,
          taskId
        );
        await _flymasterCore(participantIds, groupId, igcFolder);
      } catch (error) {
        console.error("Error downloading Flymaster IGCs:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Flymaster download failed"
        );
      } finally {
        setFlymasterProgress(initialProgressState);
        setIsDownloading(false);
      }
    },
    [isDownloading, flymaster, competitionId, taskId, _flymasterCore]
  );

  const downloadAll = useCallback(
    async (participantIds: number[], groupId: string) => {
      if (isDownloading) return;
      if (!flymaster?.username || !flymaster?.password) {
        setErrorMessage("Flymaster credentials not configured");
        return;
      }

      cancelledRef.current = false;
      setIsDownloading(true);
      setErrorMessage("");

      try {
        const igcFolder = await window.scoring.getCompetitionIgcFolder(
          competitionId,
          taskId
        );

        // Phase 1: Flymaster
        setDownloadAllPhase("flymaster");
        await _flymasterCore(participantIds, groupId, igcFolder);
        setFlymasterProgress(initialProgressState);

        if (cancelledRef.current) return;

        // Find pilots still without tracks
        const remainingAfterFlymaster = participantIds.filter((id) => {
          const status = downloadStatusRef.current.get(id);
          return !status || status.status !== "success";
        });

        // Phase 2: XContest (skip silently if no credentials or no eligible pilots)
        if (
          remainingAfterFlymaster.length > 0 &&
          xcontest?.username &&
          xcontest?.password
        ) {
          const xcontestEligible = remainingAfterFlymaster.filter((id) => {
            const participant = participants.find((p) => p.id === id);
            return participant?.xcontest;
          });

          if (xcontestEligible.length > 0) {
            if (cancelledRef.current) return;
            setDownloadAllPhase("xcontest");
            await _xcontestCore(xcontestEligible, igcFolder);
            setXcontestProgress(initialProgressState);
          }
        }

        if (cancelledRef.current) return;

        // Find pilots still without tracks
        const remainingAfterXcontest = participantIds.filter((id) => {
          const status = downloadStatusRef.current.get(id);
          return !status || status.status !== "success";
        });

        // Phase 3: Volandoo (skip if no eligible pilots)
        if (remainingAfterXcontest.length > 0) {
          const volandooEligible = remainingAfterXcontest.filter((id) => {
            const participant = participants.find((p) => p.id === id);
            return participant?.volandoo;
          });

          if (volandooEligible.length > 0) {
            if (cancelledRef.current) return;
            setDownloadAllPhase("volandoo");
            await _volandooCore(volandooEligible, igcFolder);
            setVolandooProgress(initialProgressState);
          }
        }
      } catch (error) {
        console.error("Error in Download All:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Download All failed"
        );
      } finally {
        setFlymasterProgress(initialProgressState);
        setXcontestProgress(initialProgressState);
        setVolandooProgress(initialProgressState);
        setIsDownloading(false);
        setDownloadAllPhase(null);
      }
    },
    [
      isDownloading,
      flymaster,
      xcontest,
      competitionId,
      taskId,
      participants,
      _flymasterCore,
      _xcontestCore,
      _volandooCore,
    ]
  );

  return {
    downloadXcontest,
    downloadVolandoo,
    downloadFlymaster,
    downloadAll,
    xcontestProgress,
    volandooProgress,
    flymasterProgress,
    downloadStatus,
    downloadAllPhase,
    isDownloading,
    errorMessage,
    cancelDownload,
  };
}

export default useCompetitionDownload;
