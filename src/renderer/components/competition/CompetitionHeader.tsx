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
  onEditFormula?: () => void;
  onEditCompetition?: () => void;
  onEditCategories?: () => void;
  onEditTeams?: () => void;
}

const CompetitionHeader: React.FC<CompetitionHeaderProps> = ({
  competition,
  taskCount,
  scoredTaskCount,
  participantCount,
  onExport,
  onEditFormula,
  onEditCompetition,
  onEditCategories,
  onEditTeams,
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
          {onEditFormula ? (
            <button
              onClick={onEditFormula}
              className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm font-medium flex items-center gap-1"
              title="Edit formula parameters"
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {competition.formula.name}
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded">
              {competition.formula.name}
            </span>
          )}
          {onEditCompetition && (
            <button
              onClick={onEditCompetition}
              className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 text-sm font-medium flex items-center gap-1"
              title="Edit competition details"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
          )}
          {onEditCategories && (
            <button
              onClick={onEditCategories}
              className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded hover:bg-teal-200 text-sm font-medium flex items-center gap-1"
              title="Manage categories"
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
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Categories
              {(competition.categories?.length ?? 0) > 0 && (
                <span className="ml-0.5 px-1 py-0.5 bg-teal-200 text-teal-800 text-xs rounded-full leading-none">
                  {competition.categories!.length}
                </span>
              )}
            </button>
          )}
          {onEditTeams && (
            <button
              onClick={onEditTeams}
              className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm font-medium flex items-center gap-1"
              title="Manage teams"
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Teams
            </button>
          )}
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
