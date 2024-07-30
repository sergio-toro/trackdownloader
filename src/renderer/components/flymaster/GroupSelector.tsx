import React from "react";
import { useSettings } from "@renderer/context/settingsContext";
import Card from "@components/layout/Card";
import Alert from "@components/layout/Alert";

interface Groups {
  id: string;
  name: string;
}

export default function FlymasterGroupSelector() {
  const {
    settings: { flymaster },
    setFlymaster,
  } = useSettings();

  const isFlymasterConfigured = flymaster?.username && flymaster?.password;

  const fetchFlymasterGroups = async () => {
    try {
      const groups = await window.scrappers.flymasterGroups({
        username: flymaster?.username,
        password: flymaster?.password,
      });
      setFlymaster({
        ...flymaster,
        groups,
        selectedGroup: null,
      });
      // setGroups(groups);
    } catch (error) {
      console.error("Error fetching Flymaster groups:", error);
    }
  };

  const handleGroupClick = (group: Groups) => {
    setFlymaster({
      ...flymaster,
      selectedGroup: group,
    });
    localStorage.setItem("selectedGroup", JSON.stringify(group));
  };

  return (
    <Card
      title="Flymaster groups"
      titleActions={
        isFlymasterConfigured && (
          <button onClick={fetchFlymasterGroups}>
            {flymaster.groups?.length > 0 ? "Reload groups" : "Load groups"}
          </button>
        )
      }
    >
      {!isFlymasterConfigured && (
        <Alert variant="warning">
          Please configure your Flymaster credentials in the settings to see
          your groups.
        </Alert>
      )}
      {isFlymasterConfigured && flymaster.groups?.length > 0 ? (
        <div>
          <table className="max-w-[35rem] ">
            <thead>
              <tr>
                <th className=" px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className=" px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className=" tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {flymaster.groups.map((group) => {
                const isSelected =
                  flymaster.selectedGroup?.id &&
                  group.id === flymaster.selectedGroup.id;
                return (
                  <tr
                    key={group.id}
                    className={`hover:bg-slate-100 cursor-pointer ${
                      isSelected ? "bg-blue-100" : ""
                    }`}
                    onClick={() => handleGroupClick(group)}
                  >
                    <td className=" px-6 py-4 whitespace-nowrap text-left">
                      {group.id}
                    </td>
                    <td className=" px-6 py-4 whitespace-nowrap text-left">
                      {group.name}
                    </td>
                    <td className=" px-6 py-4 whitespace-nowrap text-left">
                      <input
                        type="checkbox"
                        value={group.id}
                        readOnly={true}
                        defaultChecked={isSelected}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        isFlymasterConfigured && (
          <p className=" text-center">No groups to render.</p>
        )
      )}
    </Card>
  );
}
