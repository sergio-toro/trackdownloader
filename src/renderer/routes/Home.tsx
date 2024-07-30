import React, { useRef, useState } from "react";
import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import Downloader from "@components/Downloader";
import TableSummary from "@components/TableSummary";
import TracksTable from "@components/TracksTable";
import useFetchIGCs from "@renderer/hooks/useScrapIGCs";
import ProgressLines from "@components/ProgressLines";

const Home: React.FC = () => {
  const tableRef = useRef<HTMLTableElement>(null);
  const {
    settings: { pilots },
  } = useSettings();
  const {
    fetchFlyMasterIGCs,
    fetchXcontestIGCs,
    fetchVolandooIGCs,
    selectFolder,
    listIGCs,
    errorMessage,
    flymasterProgress,
    xcontestProgress,
    volandooProgress,
  } = useFetchIGCs();
  const [selectedPilotIds, setSelectedPilotIds] = useState<Set<number>>(
    new Set()
  );
  return (
    <div id="application">
      <Configuration />
      <Downloader
        fetchFlyMasterIGCs={fetchFlyMasterIGCs}
        fetchXcontestIGCs={fetchXcontestIGCs}
        fetchVolandooIGCs={fetchVolandooIGCs}
        selectFolder={selectFolder}
        listIGCs={listIGCs}
        errorMessage={errorMessage}
      />
      <ProgressLines
        flymasterProgress={flymasterProgress}
        xcontestProgress={xcontestProgress}
        volandooProgress={volandooProgress}
      />

      {pilots.length > 0 ? (
        <div className="w-full">
          <TableSummary
            tableRef={tableRef}
            selectedPilotIds={selectedPilotIds}
          />
          <TracksTable
            tableRef={tableRef}
            listIGCs={listIGCs}
            selectedPilotIds={selectedPilotIds}
            setSelectedPilotIds={setSelectedPilotIds}
            fetchXcontestIGCs={fetchXcontestIGCs}
            fetchVolandooIGCs={fetchVolandooIGCs}
          />
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
