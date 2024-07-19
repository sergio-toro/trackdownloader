import React, { createContext, useContext, useEffect, useState } from "react";

export interface TracksState {
  igcFiles: string[];
  parsedIgcIds: string[];
  selectedDate: string;
  selectedFolder: string;
  igcsInDirectory: string;
  setIgcFiles: (files: string[]) => void;
  setParsedIgcIds: (ids: string[]) => void;
  setSelectedDate: (date: string) => void;
  setSelectedFolder: (folder: string) => void;
  setIgcsInDirectory: (igcsInDirectory: string) => void;
}

const initialContext: TracksState = {
  igcFiles: [],
  parsedIgcIds: [],
  selectedDate: "",
  selectedFolder: "",
  igcsInDirectory: "",
  setIgcFiles: () => {},
  setParsedIgcIds: () => {},
  setSelectedDate: () => {},
  setSelectedFolder: () => {},
  setIgcsInDirectory: () => {},
};

const TracksContext = createContext<TracksState>(initialContext);

export const useTableTracks = () => useContext(TracksContext);

const LOCAL_STORAGE_KEY = "tracks";

export const TracksProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [igcFiles, setIgcFiles] = useState<string[]>(initialContext.igcFiles);
  const [parsedIgcIds, setParsedIgcIds] = useState<string[]>(
    initialContext.parsedIgcIds
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    initialContext.selectedDate
  );
  const [selectedFolder, setSelectedFolder] = useState<string>(
    initialContext.selectedFolder
  );
  const [igcsInDirectory, setIgcsInDirectory] = useState<string>(
    initialContext.igcsInDirectory
  );

  const tracks: TracksState = {
    igcFiles,
    parsedIgcIds,
    selectedDate,
    selectedFolder,
    igcsInDirectory,
    setIgcFiles,
    setParsedIgcIds,
    setSelectedDate,
    setSelectedFolder,
    setIgcsInDirectory,
  };

  useEffect(() => {
    const storedTracks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTracks) {
      const parsedTracks = JSON.parse(storedTracks);
      setIgcFiles(parsedTracks.igcFiles || []);
      setParsedIgcIds(parsedTracks.parsedIgcIds || []);
      setSelectedDate(parsedTracks.selectedDate || "");
      setSelectedFolder(parsedTracks.selectedFolder || "");
      setIgcsInDirectory(parsedTracks.igcsInDirectory || "");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tracks));
  }, [igcFiles, parsedIgcIds, selectedDate, selectedFolder, igcsInDirectory]);

  return (
    <TracksContext.Provider value={tracks}>{children}</TracksContext.Provider>
  );
};
