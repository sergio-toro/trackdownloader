import React, { useRef } from "react";
import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import Downloader from "@components/Downloader";
// import TableSummary from "@components/TableSummary";
import useFetchIGCs from "@renderer/hooks/useScrapIGCs";
import ProgressLines from "@components/ProgressLines";
import LeagueTable from "@components/LeagueTable";
import { Tabs } from "@components/layout/Tabs";
import { Tab } from "@components/layout/Tab";

const Home: React.FC = () => {
  const tableRef = useRef<HTMLTableElement>(null);
  const {
    settings: { pilots, leagues },
  } = useSettings();
  const {
    fetchFlyMasterIGCs,
    fetchXcontestIGCs,
    fetchVolandooIGCs,
    selectFolder,
    listIGCs,
    isListingDirectory,
    errorMessage,
    flymasterProgress,
    xcontestProgress,
    volandooProgress,
  } = useFetchIGCs();

  return (
    <div id="application">
      <Configuration />

      {isListingDirectory &&
        !flymasterProgress.visible &&
        !xcontestProgress.visible &&
        !volandooProgress.visible && (
          <div className="w-full mt-4">
            <div className="text-sm text-gray-500">
              Reading IGC tracks in directory...
            </div>
          </div>
        )}
      <ProgressLines
        flymasterProgress={flymasterProgress}
        xcontestProgress={xcontestProgress}
        volandooProgress={volandooProgress}
      />
      <Downloader
        leagues={leagues}
        fetchFlyMasterIGCs={fetchFlyMasterIGCs}
        fetchXcontestIGCs={fetchXcontestIGCs}
        fetchVolandooIGCs={fetchVolandooIGCs}
        listIGCs={listIGCs}
        errorMessage={errorMessage}
      />

      {pilots?.length > 0 ? (
        <div className="w-full">
          <Tabs>
            {leagues.map((league) => {
              const pilotsInLeague = pilots.filter(
                (pilot) => pilot.league === league
              );
              return (
                <Tab key={league} label={`League ${league}`}>
                  {/* <TableSummary tableRef={tableRef} /> */}

                  <LeagueTable
                    league={league}
                    pilots={pilotsInLeague}
                    tableRef={tableRef}
                    listIGCs={listIGCs}
                    fetchXcontestIGCs={fetchXcontestIGCs}
                    fetchVolandooIGCs={fetchVolandooIGCs}
                    fetchFlyMasterIGCs={fetchFlyMasterIGCs}
                    selectFolder={selectFolder}
                    errorMessage={errorMessage}
                  />
                </Tab>
              );
            })}
          </Tabs>
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
