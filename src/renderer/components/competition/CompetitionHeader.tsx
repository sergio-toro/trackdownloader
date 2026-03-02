/**
 * Competition header component
 *
 * Displays competition metadata, stats, and export button
 */

import React from "react";
import type { Competition } from "@main/scoring/types";

interface CompetitionHeaderProps {
  competition: Competition;
  taskCount: number;
  scoredTaskCount: number;
  participantCount: number;
  onExport: () => void;
}

const CompetitionHeader: React.FC<CompetitionHeaderProps> = ({
  competition,
  taskCount,
  scoredTaskCount,
  participantCount,
  onExport,
}) => {
  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };

    if (start === end) {
      return startDate.toLocaleDateString("en-US", options);
    }

    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {competition.name}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {competition.location || "No location"}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatDateRange(competition.startDate, competition.endDate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
            {competition.formula.name}
          </span>
          <button
            onClick={onExport}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {participantCount}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Pilots
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{taskCount}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Tasks
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {scoredTaskCount}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Scored
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitionHeader;
