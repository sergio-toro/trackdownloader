import React from "react";
import FlymasterGroupSelector from "@components/flymaster/GroupSelector";
import FlymasterCredentialsForm from "@components/flymaster/CredentialsForm";
import XContestCredentialsForm from "@components/xcontest/CredentialsForm";
import PilotsForm from "@components/PilotsForm";
import { useSettings } from "@renderer/context/settingsContext";
import DropDownButton from "./buttons/DropDownButton";
import Card from "./layout/Card";

const Configuration: React.FC = () => {
  const {
    settings: { debug, temporalFolder },
    setDebug,
    setTemporalFolder,
  } = useSettings();

  const handleToggleDebug = () => {
    setDebug(!debug);
  };
  const selectFolder = async () => {
    try {
      const directory = await window.tracks.selectDirectory();
      setTemporalFolder(directory);
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };
  return (
    <div className="min-w-full relative bg-zinc-100 rounded-md border-2 border-gray-200 shadow-md mt-6">
      <button
        className="border border-gray-400 rounded-md text-xs px-2 py-1 absolute right-4 top-2 cursor-pointer"
        onClick={handleToggleDebug}
      >
        Debug: {debug ? "ON" : "OFF"}
      </button>
      <div className="flex gap-3 justify-start items-center px-4 py-2">
        <DropDownButton text="Config">
          <div className="min-w-full flex gap-4 " role="menu">
            <div className="flex flex-col w-1/2 gap-2">
              <div className="flex justify-between gap-2">
                <FlymasterCredentialsForm />
                <XContestCredentialsForm />
              </div>
              <FlymasterGroupSelector />
            </div>
            <div className="flex flex-col gap-2">
              <Card title="Temporal folder" titleActions={null}>
                <p>
                  Stores Flymaster tracks before moving them to each league
                  folder
                </p>
                <button
                  onClick={() => selectFolder()}
                  className="border border-gray-300 px-2 py-1 mt-4 mr-4 font-medium text-sm rounded-md hover:bg-gray-100"
                >
                  {!temporalFolder ? "Select Folder" : "Change Folder"}
                </button>
                {temporalFolder && (
                  <span className="text-sm py-3 text-gray-700 ">
                    {temporalFolder}
                  </span>
                )}
              </Card>
              <PilotsForm />
            </div>
          </div>
        </DropDownButton>
      </div>
    </div>
  );
};

export default Configuration;
