import { useSettings } from "@renderer/context/settingsContext";
import { useTableTracks } from "@renderer/context/tableTracksContext";
import React, { RefObject } from "react";
import cx from "classnames";

export interface TableProps {
  tableRef: RefObject<HTMLTableElement>;
  league: string;
}

const TableSummary: React.FC<TableProps> = ({ tableRef, league }) => {
  const {
    settings: { pilots },
  } = useSettings();

  const { igcFiles, notAttendedPilotIds } = useTableTracks();
  const validIgcs = igcFiles[league]?.validIgcs?.length || 0;
  const invalidIgcs = igcFiles[league]?.invalidIgcs?.length || 0;
  const pilotsInLeague = pilots.filter((pilot) => pilot.league === league);
  const notAttendedPilots = pilotsInLeague.filter((pilot) =>
    notAttendedPilotIds.has(pilot.id)
  );
  const attendedPilotsLength = pilotsInLeague.length - notAttendedPilots.length;

  const handleNoAssistedClick = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };
  return (
    <div className="mb-4 flex justify-between ">
      <div className="flex gap-2 ">
        {validIgcs > 0 && (
          <h2
            className={cx("p-2 rounded font-semibold", {
              "bg-green-200": validIgcs === attendedPilotsLength,
              "bg-yellow-100": validIgcs > attendedPilotsLength,
              "bg-red-200": validIgcs < attendedPilotsLength,
            })}
          >
            Valid tracks: {validIgcs}
          </h2>
        )}
        {invalidIgcs > 0 && (
          <h2
            className={`p-2 rounded font-semibold ${invalidIgcs > 0 ? "bg-red-200" : ""}`}
          >
            Invalid tracks: {invalidIgcs}
          </h2>
        )}
      </div>
      <div className=" flex gap-2">
        <h2 className="bg-zinc-200 p-2 rounded font-semibold">
          Attended: {pilotsInLeague.length - notAttendedPilots.length}
        </h2>
        <button
          className="bg-zinc-200 p-2 rounded font-semibold"
          onClick={handleNoAssistedClick}
        >
          Not attended: {notAttendedPilots.length}
        </button>
      </div>
    </div>
  );
};

export default TableSummary;
