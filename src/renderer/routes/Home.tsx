import React, { useRef } from "react";
import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import Downloader from "@components/Downloader";
import useFetchIGCs from "@renderer/hooks/useScrapIGCs";
import TableSummary from "@components/TableSummary";
import TracksTable from "@components/TracksTable";
import ProgressLines from "@components/ProgressLines";

export interface ProgressState {
  visible: boolean;
  percent: number;
  detail: string | null;
}

const Home: React.FC = () => {
  const {
    settings: { pilots },
  } = useSettings();

  const { selectedPilotIds } = useFetchIGCs();

  const tableRef = useRef<HTMLTableElement>(null);

  const sortedPilots = (pilots || []).sort((a, b) => {
    const aSelected = selectedPilotIds.has(a.id);
    const bSelected = selectedPilotIds.has(b.id);

    if (aSelected && !bSelected) return 1;
    if (!aSelected && bSelected) return -1;

    return a.name.localeCompare(b.name);
  });

  return (
    <div id="application">
      <Configuration />
      <Downloader />
      <ProgressLines />

      {sortedPilots.length > 0 ? (
        <div className="flex flex-col gap-8">
          <div>
            <TableSummary tableRef={tableRef} />
            <TracksTable tableRef={tableRef} />
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
