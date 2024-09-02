import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ListIGCsResponse } from "@main/tracks/listIGCs";

export interface TracksState {
  igcFiles: Record<string, ListIGCsResponse>;
  parsedIgcIds: string[];
  selectedDate: string;
  selectedFolders: Record<string, string>;
  notAttendedPilotIds: Set<number>;
  setNotAttendedPilotIds: React.Dispatch<Set<number>>;
  setIgcFiles: React.Dispatch<
    React.SetStateAction<Record<string, ListIGCsResponse>>
  >;
  setParsedIgcIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  setSelectedFolders: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

const initialContext: TracksState = {
  igcFiles: {}, // validIgcs: [], invalidIgcs: []
  parsedIgcIds: [],
  selectedDate: "",
  selectedFolders: {},
  notAttendedPilotIds: new Set(),
  setIgcFiles: () => {},
  setParsedIgcIds: () => {},
  setSelectedDate: () => {},
  setSelectedFolders: () => {},
  setNotAttendedPilotIds: () => {},
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
  const [igcFiles, setIgcFiles] = useState<Record<string, ListIGCsResponse>>(
    {}
  );
  const [parsedIgcIds, setParsedIgcIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedFolders, setSelectedFolders] = useState<
    Record<string, string>
  >({});

  const [notAttendedPilotIds, setNotAttendedPilotIds] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    const storedTracks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTracks) {
      const parsedTracks = JSON.parse(storedTracks);
      setIgcFiles(parsedTracks.igcFiles || {});
      setParsedIgcIds(parsedTracks.parsedIgcIds || []);
      setSelectedDate(parsedTracks.selectedDate || "");
      setSelectedFolders(parsedTracks.selectedFolders || {});
      setNotAttendedPilotIds(new Set(parsedTracks.notAttendedPilotIds || []));
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
        notAttendedPilotIds: Array.from(notAttendedPilotIds),
      })
    );
  }, [
    igcFiles,
    parsedIgcIds,
    selectedDate,
    selectedFolders,
    notAttendedPilotIds,
  ]);
  return (
    <TracksContext.Provider
      value={{
        igcFiles,
        parsedIgcIds,
        selectedDate,
        selectedFolders,
        notAttendedPilotIds,
        setIgcFiles,
        setParsedIgcIds,
        setSelectedDate,
        setSelectedFolders,
        setNotAttendedPilotIds,
      }}
    >
      {children}
    </TracksContext.Provider>
  );
};
