import React from "react";
import { TableProps } from "./TableSummary";
import { format, intervalToDuration } from "date-fns";
import { useTableTracks } from "@renderer/context/tableTracksContext";
import { ListIGCsResponse } from "@main/tracks/listIGCs";
import useFetchIGCs from "@renderer/hooks/useScrapIGCs";
import { useSettings } from "@renderer/context/settingsContext";

const TracksTable: React.FC<TableProps> = ({
  tableRef,
  selectedPilotIds,
  setSelectedPilotIds,
}) => {
  const { selectedFolder, igcFiles, setIgcFiles } = useTableTracks();
  const { fetchXcontestIGCs, fetchVolandooIGCs } = useFetchIGCs();

  const {
    settings: { pilots },
  } = useSettings();

  const deleteFlight = async (fileName: string, pilotName: string) => {
    try {
      if (
        window.confirm(
          `Are you sure you want to delete ${fileName} from ${pilotName}?`
        )
      ) {
        await window.tracks.deleteIGCs(`${selectedFolder}/${fileName}`);

        setIgcFiles((prevIgcFiles: ListIGCsResponse) => {
          const updatedValidIgcs = prevIgcFiles.validIgcs.filter(
            (file) => file.name !== fileName
          );
          const updatedInvalidIgcs = prevIgcFiles.invalidIgcs.filter(
            (file) => file.name !== fileName
          );

          return {
            validIgcs: updatedValidIgcs,
            invalidIgcs: updatedInvalidIgcs,
          };
        });
      }
    } catch (error) {
      console.error("Error deleting flight:", error);
    }
  };

  console.log("valid", igcFiles.validIgcs);
  const combinedIgcFiles = [
    ...igcFiles.validIgcs.map((file) => ({ ...file, isValid: true })),
    ...igcFiles.invalidIgcs.map((file) => ({ ...file, isValid: false })),
  ];
  const handlePilotClick = (pilotId: number) => {
    setSelectedPilotIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(pilotId)) {
        newSelected.delete(pilotId);
      } else {
        newSelected.add(pilotId);
      }
      return newSelected;
    });
  };

  const sortedPilots = (pilots || []).sort((a, b) => {
    const aSelected = selectedPilotIds.has(a.id);
    const bSelected = selectedPilotIds.has(b.id);

    if (aSelected && !bSelected) return 1;
    if (!aSelected && bSelected) return -1;

    return a.name.localeCompare(b.name);
  });
  return (
    <table ref={tableRef}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Pilot Name</th>
          <th>Source</th>
          <th>Site</th>
          <th>Details</th>
          <th>Status</th>
          <th>Scrap</th>
          <th>Links</th>
          <th>Asisted</th>
        </tr>
      </thead>
      <tbody>
        {sortedPilots.map((pilot, index) => {
          const pilotTracks = combinedIgcFiles.filter(
            (track) => track.pilotId === Number(pilot.id)
          );
          // console.log("PILOT TRACKS", pilotTracks);

          const isInvalid = pilotTracks.some(
            (track) => track.isValid === false
          );
          const isSelected = selectedPilotIds.has(pilot.id);
          const hasMoreThanOneFlight = pilotTracks.length > 1;

          return (
            <tr
              key={index}
              className={
                isInvalid
                  ? "bg-red-200"
                  : hasMoreThanOneFlight
                    ? "bg-yellow-100"
                    : isSelected
                      ? "opacity-60 bg-gray-200"
                      : ""
              }
            >
              <td>{pilot.id}</td>
              <td>{pilot.name}</td>

              <td>
                <div className="flex flex-col justify-between gap-7">
                  {pilotTracks.map((track) => (
                    <div key={track.name}>{track.source}</div>
                  ))}
                </div>
              </td>
              <td>
                <div className="flex flex-col justify-between gap-7">
                  {pilotTracks.map((track) =>
                    "site" in track ? (
                      <div key={track.name}>{track.site}</div>
                    ) : (
                      <div key={track.name}>N/A</div>
                    )
                  )}
                </div>
              </td>
              <td>
                {pilotTracks.length > 0 &&
                  pilotTracks.map((track, i) => {
                    if (!("start" in track)) {
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-center gap-3"
                        >
                          <p>Error: {track.errorMessage}</p>
                          <button
                            className="bg-red-800 text-white p-1 rounded-md "
                            onClick={() =>
                              deleteFlight(track.name, String(track.pilotId))
                            }
                          >
                            Delete
                          </button>
                        </div>
                      );
                    }
                    const trackDuration = intervalToDuration({
                      start: new Date(track.start.timestamp),
                      end: new Date(track.end.timestamp),
                    });
                    return (
                      <div
                        key={i}
                        className="flex justify-between items-center mt-2 mb-2  "
                      >
                        <div className="flex flex-col items-start font-bold ">
                          <p>
                            Start Time:{" "}
                            <span className="font-normal">
                              {format(track.start.time, "HH:mm")} h
                            </span>
                          </p>
                          <p>
                            Duration:{" "}
                            <span className="font-normal">
                              {trackDuration.hours > 0 && (
                                <>{trackDuration.hours}h</>
                              )}{" "}
                              {trackDuration.minutes > 0 && (
                                <>{trackDuration.minutes} min</>
                              )}
                            </span>{" "}
                          </p>
                        </div>

                        <button
                          className="bg-red-800 text-white p-1 rounded-md "
                          onClick={() =>
                            deleteFlight(track.name, track.pilotName)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
              </td>
              <td>
                <div className="flex flex-col gap-5">
                  {pilotTracks.map((track) => (
                    <div key={track.name} className="flex flex-col mt-1 mb-1">
                      <div>
                        <p>{track.isValid ? "Valid" : "Invalid"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </td>
              <td>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => fetchXcontestIGCs(pilot)}
                    className=" border-orange-600  border-2   rounded-md  "
                  >
                    XContest
                  </button>
                  <button
                    onClick={() => fetchVolandooIGCs(pilot)}
                    className="border-[#342467] border-2 rounded-md "
                  >
                    Volandoo
                  </button>
                </div>
              </td>
              <td>
                <div className="flex flex-col gap-3">
                  <a
                    href={`https://www.xcontest.org/world/en/pilots/detail:${pilot.xctrack}`}
                    className=" font-bold underline  "
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    XContest
                  </a>
                  <a
                    href={`https://volandoo.com/pilots/${pilot.volandoo}`}
                    className=" font-bold underline "
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Volandoo
                  </a>
                </div>
              </td>
              <td>
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    value={pilot.id}
                    name="pilotId"
                    checked={isSelected}
                    onChange={() => handlePilotClick(Number(pilot.id))}
                    className="absolute opacity-0 cursor-pointer  z-10 w-10 h-10"
                  />
                  {isSelected ? <p>❌</p> : <p>✅</p>}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TracksTable;
