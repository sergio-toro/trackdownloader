import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import FlymasterGroupSelector from "@components/flymaster/GroupSelector";
import FlymasterCredentialsForm from "@components/flymaster/CredentialsForm";
import XContestCredentialsForm from "@components/xcontest/CredentialsForm";
import PilotsForm from "@components/PilotsForm";
import { useSettings } from "@renderer/context/settingsContext";
import DropDownButton from "./buttons/DropDownButton";
import Card from "./layout/Card";

const Configuration: React.FC = () => {
  const {
    settings: { debug, programDataFolder },
    setDebug,
    setProgramDataFolder,
  } = useSettings();

  const [defaultStoragePath, setDefaultStoragePath] = useState<string>("");
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    // Get the default storage path on mount
    window.scoring.getStoragePath().then(setDefaultStoragePath);
  }, []);

  const handleToggleDebug = () => {
    setDebug(!debug);
  };

  const selectProgramDataFolder = async () => {
    try {
      const directory = await window.scoring.selectDirectory();
      if (!directory) return;

      setIsMigrating(true);
      try {
        // Set storage path with migration enabled
        await window.scoring.setStoragePath(directory, true);
        setProgramDataFolder(directory);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        alert(`Failed to change program data folder: ${message}`);
      } finally {
        setIsMigrating(false);
      }
    } catch (error) {
      console.error("Error selecting program data folder:", error);
    }
  };

  const resetProgramDataFolder = async () => {
    try {
      setIsMigrating(true);
      // Set to empty string to use default, with migration
      await window.scoring.setStoragePath("", true);
      setProgramDataFolder("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to reset program data folder: ${message}`);
    } finally {
      setIsMigrating(false);
    }
  };
  return (
    <div className="min-w-full relative bg-zinc-100 rounded-md border-2 border-gray-200 shadow-md mt-6">
      <div className="flex gap-3 justify-between items-center px-4 py-2">
        <div className="flex gap-3 items-center">
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
                <Card title="Program data folder" titleActions={null}>
                  <p>
                    Location for storing competition data and temporary
                    downloads
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={selectProgramDataFolder}
                      disabled={isMigrating}
                      className="border border-gray-300 px-2 py-1 font-medium text-sm rounded-md hover:bg-gray-100 disabled:opacity-50"
                    >
                      {isMigrating
                        ? "Migrating..."
                        : !programDataFolder
                          ? "Select Folder"
                          : "Change Folder"}
                    </button>
                    {programDataFolder && (
                      <button
                        onClick={resetProgramDataFolder}
                        disabled={isMigrating}
                        className="border border-gray-300 px-2 py-1 font-medium text-sm rounded-md hover:bg-gray-100 disabled:opacity-50"
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>
                  <p className="text-sm py-2 text-gray-700">
                    {programDataFolder || defaultStoragePath || "Loading..."}
                    {!programDataFolder && defaultStoragePath && (
                      <span className="text-gray-500"> (default)</span>
                    )}
                  </p>
                </Card>
                <PilotsForm />
              </div>
            </div>
          </DropDownButton>
        </div>
        <div className="flex gap-3 items-center">
          <Link
            to="/competitions"
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Competitions
          </Link>
          <button
            className="border border-gray-400 rounded-md text-xs px-2 py-1 cursor-pointer"
            onClick={handleToggleDebug}
          >
            Debug: {debug ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Configuration;
