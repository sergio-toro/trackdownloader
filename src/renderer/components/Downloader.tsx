import React, { useEffect } from "react";

import Card from "./layout/Card";
import Input from "./forms/Input";
import { useTableTracks } from "@renderer/context/tableTracksContext";
import ScrapButton from "./buttons/ScrapButton";
import useFetchIGCs from "@renderer/hooks/useScrapIGCs";

const Downloader = () => {
  const { selectedDate, selectedFolder, setSelectedDate } = useTableTracks();

  const {
    fetchFlyMasterIGCs,
    fetchXcontestIGCs,
    fetchVolandooIGCs,
    selectFolder,
    listIGCs,
    errorMessage,
  } = useFetchIGCs();
  useEffect(() => {
    if (selectedFolder) {
      listIGCs();
    }
  }, []);

  return (
    <Card className="w-full" title="Download Tracks">
      <div className="flex flex-row justify-between ">
        <div className=" flex gap-12 items-center ">
          <Input
            mode="vertical"
            type="date"
            label="Select a date:"
            id="date"
            name="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <div className="flex flex-col px-8 items-start border-l-2 border-l-zinc-300  ">
            <button
              onClick={selectFolder}
              className="border-gray-300 font-semibold text-sm"
            >
              {!selectedFolder ? "Select Folder:" : "Change Folder:"}
            </button>
            {selectedFolder && (
              <span className="text-sm py-3 text-gray-700 ">
                {selectedFolder}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-row gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Get IGCS:</h2>
            <div className="flex flex-row gap-2">
              <ScrapButton
                label="FLYMASTER"
                onClick={fetchFlyMasterIGCs}
                gradientClass="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-900"
              />
              <ScrapButton
                label="XCONTEST"
                onClick={() => fetchXcontestIGCs()}
                gradientClass="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700"
              />
              <ScrapButton
                label="VOLANDOO"
                onClick={() => fetchVolandooIGCs()}
                gradientClass="bg-gradient-to-br from-purple-600 via-purple-800 to-[#342467]"
              />
              <ScrapButton
                label="List IGCs"
                onClick={listIGCs}
                gradientClass="bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800"
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-200 text-red-700 p-2 rounded-md mb-4 mt-6 ">
            {errorMessage}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Downloader;
