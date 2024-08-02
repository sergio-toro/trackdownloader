import React from "react";
import FlymasterGroupSelector from "@components/flymaster/GroupSelector";
import FlymasterCredentialsForm from "@components/flymaster/CredentialsForm";
import XContestCredentialsForm from "@components/xcontest/CredentialsForm";
import PilotsForm from "@components/PilotsForm";
import { useSettings } from "@renderer/context/settingsContext";
import DropDownButton from "./buttons/DropDownButton";

const Configuration: React.FC = () => {
  const {
    settings: { debug },
    setDebug,
  } = useSettings();

  const handleToggleDebug = () => {
    setDebug(!debug);
  };

  return (
    <div className="min-w-full relative bg-zinc-100 rounded-md border-2 border-gray-200 shadow-md mt-6">
      <button
        className="border border-gray-400 rounded-md text-xs px-2 py-1 absolute right-2 top-2 "
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
            <div>
              <PilotsForm />
            </div>
          </div>
        </DropDownButton>
      </div>
    </div>
  );
};

export default Configuration;
