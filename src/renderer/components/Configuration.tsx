import React, { useState } from "react";
import { useSettings } from "@renderer/context/settingsContext";
import FlymasterGroupSelector from "@components/flymaster/GroupSelector";
import FlymasterCredentialsForm from "@components/flymaster/CredentialsForm";
import XContestCredentialsForm from "@components/xcontest/CredentialsForm";
import PilotsForm from "@components/PilotsForm";

export default function Configuration() {
  const {
    settings: { theme },
    setTheme,
  } = useSettings();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-w-full bg-gray-100 rounded-md border-2 border-gray-200 shadow-md">
      <div className="grid grid-cols-2 gap-2 p-2 ">
        <div className="flex flex-row gap-3 justify-start items-center">
          <button
            className="font-bold text-xl text-black"
            id="menu-button"
            onClick={toggleDropdown}
          >
            Config
          </button>
        </div>
        <div className="text-right">
          <button onClick={toggleTheme}>
            {theme === "dark" ? "Light Theme" : "Dark Theme"}
          </button>
        </div>
      </div>

      {dropdownOpen && (
        <div className="w-full rounded-md shadow-md flex gap-4 p-2" role="menu">
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
