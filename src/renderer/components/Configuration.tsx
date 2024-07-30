import React, { useState } from "react";
import FlymasterGroupSelector from "@components/flymaster/GroupSelector";
import FlymasterCredentialsForm from "@components/flymaster/CredentialsForm";
import XContestCredentialsForm from "@components/xcontest/CredentialsForm";
import PilotsForm from "@components/PilotsForm";
import { useSettings } from "@renderer/context/settingsContext";

export default function Configuration() {
  const {
    settings: { debug },
    setDebug,
  } = useSettings();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleToggleDebug = () => {
    setDebug(!debug);
  };

  return (
    <div className="min-w-full bg-zinc-100 rounded-md border-2 border-gray-200 shadow-md">
      <div className="flex flex-row gap-3 justify-start items-center px-4 py-2">
        <div className="flex-grow">
          <button
            className="font-bold text-xl text-black flex items-center gap-1  "
            id="menu-button"
            onClick={toggleDropdown}
          >
            Config
            <svg
              className="-mr-1 h-6 w-6 text-gray-700"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div>
          <button
            className="border border-gray-400 rounded-md text-xs px-2 py-1"
            onClick={handleToggleDebug}
          >
            Debug: {debug ? "ON" : "OFF"}{" "}
          </button>
        </div>
      </div>

      {dropdownOpen && (
        <div
          className="w-full rounded-md shadow-md flex gap-4 p-2 "
          role="menu"
        >
          <div className="flex flex-col w-1/2 gap-2">
            <div className="flex justify-between gap-2">
              <FlymasterCredentialsForm />
              <XContestCredentialsForm />
            </div>
            <FlymasterGroupSelector />
          </div>
          <div>
            <PilotsForm />
          </div>
        </div>
      )}
    </div>
  );
}
