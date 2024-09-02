import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { ListIGCsResponse } from "@main/tracks/listIGCs";

export interface TracksState {
  igcFiles: ListIGCsResponse;
  parsedIgcIds: string[];
  selectedDate: string;
  selectedFolders: Record<string, string>;
  igcsInDirectory: string;
  selectedPilotIds: Set<number>;
  setSelectedPilotIds: React.Dispatch<Set<number>>;
  setIgcFiles: React.Dispatch<React.SetStateAction<ListIGCsResponse>>;
  setParsedIgcIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  setSelectedFolders: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setIgcsInDirectory: React.Dispatch<React.SetStateAction<string>>;
}

const initialContext: TracksState = {
  igcFiles: { validIgcs: [], invalidIgcs: [] },
  parsedIgcIds: [],
  selectedDate: "",
  selectedFolders: {},
  igcsInDirectory: "",
  selectedPilotIds: new Set(),
  setIgcFiles: () => {},
  setParsedIgcIds: () => {},
  setSelectedDate: () => {},
  setSelectedFolders: () => {},
  setIgcsInDirectory: () => {},
  setSelectedPilotIds: () => {},
};

const TracksContext = createContext<TracksState>(initialContext);

export const useTableTracks = () => {
  const { selectedFolders, selectedDate, setSelectedDate, ...contextValue } =
    useContext(TracksContext);
  return {
    ...contextValue,
    selectedFolders,
    selectedDate,
    setSelectedDate,
  };
};

const LOCAL_STORAGE_KEY = "tracks";

export const TracksProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [igcFiles, setIgcFiles] = useState<ListIGCsResponse>({
    validIgcs: [],
    invalidIgcs: [],
  });
  const [parsedIgcIds, setParsedIgcIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedFolders, setSelectedFolders] = useState<
    Record<string, string>
  >({});
  const [igcsInDirectory, setIgcsInDirectory] = useState<string>("");

  const [selectedPilotIds, setSelectedPilotIds] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    const storedTracks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTracks) {
      const parsedTracks = JSON.parse(storedTracks);
      setIgcFiles(parsedTracks.igcFiles || { validIgcs: [], invalidIgcs: [] });
      setParsedIgcIds(parsedTracks.parsedIgcIds || []);
      setSelectedDate(parsedTracks.selectedDate || "");
      setSelectedFolders(parsedTracks.selectedFolders || {});
      setIgcsInDirectory(parsedTracks.igcsInDirectory || "");
      setSelectedPilotIds(new Set(parsedTracks.selectedPilotIds || []));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        igcFiles,
        parsedIgcIds,
        selectedDate,
        selectedFolders,
        igcsInDirectory,
        selectedPilotIds: Array.from(selectedPilotIds),
      })
    );
  }, [
    igcFiles,
    parsedIgcIds,
    selectedDate,
    selectedFolders,
    igcsInDirectory,
    selectedPilotIds,
  ]);
  return (
    <TracksContext.Provider
      value={{
        igcFiles,
        parsedIgcIds,
        selectedDate,
        selectedFolders,
        igcsInDirectory,
        selectedPilotIds,
        setIgcFiles,
        setParsedIgcIds,
        setSelectedDate,
        setSelectedFolders,
        setIgcsInDirectory,
        setSelectedPilotIds,
      }}
    >
      {children}
    </TracksContext.Provider>
  );
};
