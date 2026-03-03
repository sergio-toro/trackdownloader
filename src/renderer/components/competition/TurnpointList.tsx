import React from "react";
import type { Turnpoint, TurnpointType } from "@main/scoring/types";

const TYPE_COLORS: Record<TurnpointType, string> = {
  TAKEOFF: "bg-blue-100 text-blue-800",
  SSS: "bg-green-100 text-green-800",
  TURNPOINT: "bg-gray-100 text-gray-800",
  ESS: "bg-orange-100 text-orange-800",
  GOAL: "bg-red-100 text-red-800",
};

interface TurnpointListProps {
  turnpoints: Turnpoint[];
  legDistances: number[];
}

const formatDistance = (meters: number): string => {
  if (meters <= 0) return "-";
  return `${(meters / 1000).toFixed(1)} km`;
};

const TurnpointList: React.FC<TurnpointListProps> = ({
  turnpoints,
  legDistances,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              #
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Type
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Name
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              Radius
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              Coordinates
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              Alt
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
              Leg
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {turnpoints.map((tp, i) => (
            <tr key={tp.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-sm text-gray-500">{i + 1}</td>
              <td className="px-3 py-2">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${TYPE_COLORS[tp.type]}`}
                >
                  {tp.type}
                </span>
              </td>
              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                {tp.geopoint.name || `TP${i + 1}`}
              </td>
              <td className="px-3 py-2 text-sm text-gray-600 text-right">
                {tp.radius}m
              </td>
              <td className="px-3 py-2 text-sm text-gray-500 font-mono">
                {tp.geopoint.latitude.toFixed(5)},{" "}
                {tp.geopoint.longitude.toFixed(5)}
              </td>
              <td className="px-3 py-2 text-sm text-gray-600 text-right">
                {tp.altitude}m
              </td>
              <td className="px-3 py-2 text-sm text-gray-600 text-right">
                {legDistances[i] != null
                  ? formatDistance(legDistances[i])
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TurnpointList;
