import { useSettings } from "@renderer/context/settingsContext";
import { useTableTracks } from "@renderer/context/tableTracksContext";
import React, { RefObject, SetStateAction, Dispatch } from "react";

export interface TableProps {
  tableRef: RefObject<HTMLTableElement>;
  selectedPilotIds: Set<number>;
  setSelectedPilotIds?: Dispatch<SetStateAction<Set<number>>>;
}
const TableSummary: React.FC<TableProps> = ({ tableRef, selectedPilotIds }) => {
  const {
    settings: { pilots },
  } = useSettings();
  const { igcFiles } = useTableTracks();

  const handleNoAssistedClick = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };
  return (
    <div className="mb-4 flex justify-between ">
      <div className="flex gap-2 ">
        <h2 className="bg-green-200 p-2 rounded font-semibold">
          Valid tracks: {igcFiles?.validIgcs.length}
        </h2>
        <h2
          className={`p-2 rounded font-semibold ${igcFiles.invalidIgcs.length > 0 ? "bg-red-200" : ""}`}
        >
          Invalid tracks: {igcFiles?.invalidIgcs.length}
        </h2>
      </div>
      <div className=" flex gap-2">
        <h2 className="bg-zinc-200 p-2 rounded font-semibold">
          Asisted: {pilots.length - selectedPilotIds.size}
        </h2>
        <button
          className="bg-zinc-200 p-2 rounded font-semibold"
          onClick={handleNoAssistedClick}
        >
          No asisted: {selectedPilotIds.size}
        </button>
      </div>
    </div>
  );
};

export default TableSummary;
