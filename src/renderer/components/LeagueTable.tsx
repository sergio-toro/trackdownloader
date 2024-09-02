import React from "react";
import { TableProps } from "./TableSummary";
import { format, intervalToDuration } from "date-fns";
import { useTableTracks } from "@renderer/context/tableTracksContext";
import { PilotsState } from "@renderer/context/settingsContext";
import cx from "classnames";

type Props = TableProps & {
  league: string;
  pilots: PilotsState[];
  listIGCs: () => void;
  fetchXcontestIGCs: (pilot?: PilotsState) => void;
  fetchVolandooIGCs: (pilot?: PilotsState) => void;
  fetchFlyMasterIGCs: () => void;
  selectFolder: (league: string) => void;
  errorMessage: string;
};

const styles = {
  deleteButton: "bg-red-500 text-white p-1 px-2 rounded-md hover:bg-red-600",
};

const LeagueTable: React.FC<Props> = ({
  league,
  pilots,
  tableRef,
  listIGCs,
  fetchXcontestIGCs,
  fetchVolandooIGCs,
  selectFolder,
}) => {
  const {
    selectedFolders,
    igcFiles,
    notAttendedPilotIds,
    setNotAttendedPilotIds,
  } = useTableTracks();
  const selectedFolder = selectedFolders[league] || "";

  const deleteFlight = async (fileName: string, pilotName: string) => {
    try {
      if (
        window.confirm(
          `Are you sure you want to delete ${fileName} from ${pilotName}?`
        )
      ) {
        await window.tracks.deleteIGCs(`${selectedFolder}/${fileName}`);
        listIGCs();
      }
    } catch (error) {
      console.error("Error deleting flight:", error);
    }
  };

  const combinedIgcFiles =
    igcFiles[league]?.validIgcs && igcFiles[league]?.invalidIgcs
      ? [
          ...igcFiles[league].validIgcs.map((file) => ({
            ...file,
            isValid: true,
          })),
          ...igcFiles[league].invalidIgcs.map((file) => ({
            ...file,
            isValid: false,
          })),
        ]
      : [];

  const sortedPilots = (pilots || []).sort((a, b) => {
    const aSelected = notAttendedPilotIds.has(a.id);
    const bSelected = notAttendedPilotIds.has(b.id);

    if (aSelected && !bSelected) return 1;
    if (!aSelected && bSelected) return -1;

    return a.name.localeCompare(b.name);
  });
  return (
    <div>
      <div className="flex gap-4 mb-4 items-center">
        <div className="flex gap-4">
          <button
            onClick={() => selectFolder(league)}
            className="border border-gray-300 px-2 py-1 font-medium text-sm rounded-md hover:bg-gray-100"
          >
            {!selectedFolder ? "Select Folder" : "Change Folder"}
          </button>
          {selectedFolder && (
            <span className="text-sm py-3 text-gray-700 ">
              {selectedFolder}
            </span>
          )}
        </div>
      </div>
      <table ref={tableRef}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Pilot Name</th>
            <th>Source</th>
            <th>Details</th>
            <th>Status</th>
            <th>Scrap Track</th>
            <th>Links</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedPilots.map((pilot, index) => {
            const pilotTracks = combinedIgcFiles.filter(
              (track) => track.pilotId === Number(pilot.id)
            );
            const isInvalid = pilotTracks.some(
              (track) => track.isValid === false
            );
            const isNotAttending = notAttendedPilotIds.has(pilot.id);
            const hasMoreThanOneFlight = pilotTracks.length > 1;

            return (
              <tr
                key={index}
                className={cx({
                  "bg-red-200": isInvalid,
                  "bg-yellow-100": !isInvalid && hasMoreThanOneFlight,
                  "opacity-60": isNotAttending,
                  "bg-gray-200": !isInvalid && isNotAttending,
                })}
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
                              className={styles.deleteButton}
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
                            className={styles.deleteButton}
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
                    {pilot.xcontest && (
                      <button
                        onClick={() => fetchXcontestIGCs(pilot)}
                        className="border-orange-600 border-2 rounded-md bg-orange-100 hover:bg-orange-50 px-1"
                      >
                        XContest
                      </button>
                    )}
                    {pilot.volandoo && (
                      <button
                        onClick={() => fetchVolandooIGCs(pilot)}
                        className="border-[#342467] border-2 rounded-md bg-[#342467]/10 hover:bg-[#342467]/20 px-1"
                      >
                        Volandoo
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-3">
                    {pilot.xcontest && (
                      <a
                        href={`https://www.xcontest.org/world/en/pilots/detail:${pilot.xcontest}`}
                        className=" font-bold underline  "
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        XContest
                      </a>
                    )}
                    {pilot.volandoo && (
                      <a
                        href={`https://volandoo.com/pilots/${pilot.volandoo}`}
                        className=" font-bold underline "
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Volandoo
                      </a>
                    )}
                  </div>
                </td>
                <td>
                  {/*attending/not attending button*/}
                  <button
                    className="border border-gray-300 px-2 py-1 font-medium text-sm rounded-md hover:bg-gray-100"
                    onClick={() => {
                      const newNotAttendedPilotIds = new Set(
                        notAttendedPilotIds
                      );

                      if (newNotAttendedPilotIds.has(pilot.id)) {
                        newNotAttendedPilotIds.delete(pilot.id);
                      } else {
                        newNotAttendedPilotIds.add(pilot.id);
                      }
                      setNotAttendedPilotIds(newNotAttendedPilotIds);
                    }}
                  >
                    {notAttendedPilotIds.has(pilot.id)
                      ? "Attended"
                      : "Not Attended"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LeagueTable;
