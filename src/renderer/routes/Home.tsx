import React, { useRef, useState } from "react";
import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import Downloader from "@components/Downloader";
import TableSummary from "@components/TableSummary";
import TracksTable from "@components/TracksTable";
import ProgressLines from "@components/ProgressLines";

const Home: React.FC = () => {
  const tableRef = useRef<HTMLTableElement>(null);
  const {
    settings: { pilots },
  } = useSettings();
  const [selectedPilotIds, setSelectedPilotIds] = useState<Set<number>>(
    new Set()
  );
  return (
    <div id="application">
      <Configuration />
      <Downloader />
      <ProgressLines />

      {pilots.length > 0 ? (
        <div className="flex flex-col gap-8 min-w-full">
          <div>
            <TableSummary
              tableRef={tableRef}
              selectedPilotIds={selectedPilotIds}
              setSelectedPilotIds={setSelectedPilotIds}
            />
            <TracksTable
              tableRef={tableRef}
              selectedPilotIds={selectedPilotIds}
              setSelectedPilotIds={setSelectedPilotIds}
            />
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
