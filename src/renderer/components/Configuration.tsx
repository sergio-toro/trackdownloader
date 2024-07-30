import React, { useState } from "react";
import FlymasterGroupSelector from "@components/flymaster/GroupSelector";
import FlymasterCredentialsForm from "@components/flymaster/CredentialsForm";
import XContestCredentialsForm from "@components/xcontest/CredentialsForm";
import PilotsForm from "@components/PilotsForm";

export default function Configuration() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className="min-w-full bg-zinc-100 rounded-md border-2 border-gray-200 shadow-md">
      <div className="flex flex-row gap-3 justify-start items-center px-4 py-2">
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
