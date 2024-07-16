import React, { useState } from "react";

import Configuration from "@components/Configuration";
import { useSettings } from "@renderer/context/settingsContext";
import DateForm from "@components/forms/DateForm";

interface Groups {
  id: string;
  name: string;
}

const Home: React.FC = () => {
  const {
    settings: { darkTheme, flymaster, selectedGroup },
    setDarkTheme,
    setSelectedGroup,
  } = useSettings();

  const [groups, setGroups] = useState<Groups[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  console.log("SELECTED DATE", selectedDate);
  const fetchFlymasterGroups = async () => {
    try {
      const groups = await window.scrappers.flymasterGroups(
        flymaster?.username,
        flymaster?.password
      );
      setGroups(groups);
    } catch (error) {
      console.error("Error fetching Flymaster groups:", error);
    }
  };

  const fetchFlyMasterIGCs = async () => {
    try {
      const group = await window.scrappers.flymasterIGCs(
        selectedGroup?.id,
        selectedDate,
        flymaster?.username,
        flymaster?.password
      );
      console.log("SELECTED GROUP FRONT", selectedGroup.id);
      console.log("SELECTED DATE FRONT", selectedDate);

      setSelectedGroupId(group.id);
    } catch (error) {
      console.error("Error fetching Flymaster groups:", error);
    }
  };

  const handleGroupClick = (group: Groups) => {
    setSelectedGroup(group);
    setSelectedGroupId(group.id);
    localStorage.setItem("selectedGroup", JSON.stringify(group));
  };

  return (
    <div id="application" className={` ${darkTheme ? "dark" : ""}`}>
      <Configuration />
      <DateForm selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

      <div className="flex flex-col gap-8">
        <div className="flex flex-row gap-4">
          <button onClick={fetchFlymasterGroups}>FIND FLYMASTER GROUPS</button>
          <button onClick={fetchFlyMasterIGCs}>Get IGCs</button>
          <button onClick={() => setDarkTheme(!darkTheme)}>
            {darkTheme ? "Light Theme" : "Dark Theme"}
          </button>
        </div>
        <div className="p-6 bg-gray-100 rounded-md shadow-md w-full max-w-4xl flex flex-col gap-4">
          <h1 className="text-2xl font-bold mb-4 text-center">
            Flymaster Groups
          </h1>
          {groups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className={`hover:bg-slate-200 cursor-pointer ${
                        selectedGroupId === group.id ? "bg-blue-300" : ""
                      }`}
                      onClick={() => handleGroupClick(group)}
                    >
                      <td className="border-b border-gray-200 px-6 py-4 whitespace-nowrap">
                        {group.id}
                      </td>
                      <td className="border-b border-gray-200 px-6 py-4 whitespace-nowrap">
                        {group.name}
                      </td>
                      <td className="border-b border-gray-200 px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center">No groups to render.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
