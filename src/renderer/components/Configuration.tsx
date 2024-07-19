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
    <div className="min-w-full bg-configBg rounded-lg">
      <div className="grid grid-cols-2 gap-2 p-2 ">
        <div className="flex flex-row gap-3 justify-start items-center">
          <button
            className=" gap-x-1.5 font-bold text-xl "
            id="menu-button"
            onClick={toggleDropdown}
          >
            Config
          </button>
          <svg className="-mr-1 h-5 w-5 text-gray-900">
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
          </svg>
        </div>
        <div className="text-right">
          <button onClick={toggleTheme}>
            {theme === "dark" ? "Light Theme" : "Dark Theme"}
          </button>
        </div>
      </div>

      {dropdownOpen && (
        <div
          className="w-full rounded-md shadow-md grid  grid-cols-2 gap-4 p-2"
          role="menu"
        >
          <FlymasterCredentialsForm />
          <FlymasterGroupSelector />
          <XContestCredentialsForm />
          <PilotsForm />
        </div>
      )}
    </div>
  );
}
