/**
 * Competitions list page - Competition management
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useCompetition } from "@renderer/context/competitionContext";
import { useSettings } from "@renderer/context/settingsContext";
import Card from "@components/layout/Card";
import FlymasterCredentialsForm from "@components/flymaster/CredentialsForm";
import XContestCredentialsForm from "@components/xcontest/CredentialsForm";

/**
 * Competition list view
 */
const CompetitionList: React.FC = () => {
  const navigate = useNavigate();
  const {
    recentCompetitions,
    createCompetition,
    isLoading,
    error,
    clearError,
  } = useCompetition();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCompName, setNewCompName] = useState("");
  const [newCompLocation, setNewCompLocation] = useState("");
  const [newCompStartDate, setNewCompStartDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [newCompEndDate, setNewCompEndDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const handleCreate = async () => {
    if (!newCompName.trim()) return;

    const id = await createCompetition({
      name: newCompName.trim(),
      location: newCompLocation.trim(),
      startDate: newCompStartDate,
      endDate: newCompEndDate,
    });

    if (id) {
      setShowCreateForm(false);
      setNewCompName("");
      setNewCompLocation("");
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-500 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Competitions</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          {showCreateForm ? "Cancel" : "New Competition"}
        </button>
      </div>

      {showCreateForm && (
        <Card title="New Competition">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={newCompName}
                onChange={(e) => setNewCompName(e.target.value)}
                placeholder="Competition name"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={newCompLocation}
                onChange={(e) => setNewCompLocation(e.target.value)}
                placeholder="Location"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newCompStartDate}
                  onChange={(e) => setNewCompStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={newCompEndDate}
                  onChange={(e) => setNewCompEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={!newCompName.trim() || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Create Competition
              </button>
            </div>
          </div>
        </Card>
      )}

      {recentCompetitions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No competitions yet.</p>
          <p className="text-sm">
            Create your first competition to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentCompetitions.map((comp) => (
            <div
              key={comp.id}
              onClick={() => navigate(`/competition/${comp.id}`)}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                  <p className="text-sm text-gray-500">{comp.location}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-600">
                    {comp.startDate} - {comp.endDate}
                  </p>
                  <p className="text-gray-500">
                    {comp.participantCount} pilots · {comp.taskCount} tasks
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main scoring content - shows competition list
 */
const ScoringContent: React.FC = () => {
  return <CompetitionList />;
};

/**
 * Data folder settings dialog
 */
const DataFolderSettingsDialog: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const {
    settings: { programDataFolder },
    setProgramDataFolder,
  } = useSettings();

  const [defaultStoragePath, setDefaultStoragePath] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    window.scoring.getStoragePath().then(setDefaultStoragePath);
  }, []);

  const selectFolder = async () => {
    try {
      const directory = await window.scoring.selectDirectory();
      if (!directory) return;

      setIsMigrating(true);
      try {
        await window.scoring.setStoragePath(directory, true);
        setProgramDataFolder(directory);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        alert(`Failed to change program data folder: ${message}`);
      } finally {
        setIsMigrating(false);
      }
    } catch (error) {
      console.error("Error selecting program data folder:", error);
    }
  };

  const resetFolder = async () => {
    try {
      setIsMigrating(true);
      await window.scoring.setStoragePath("", true);
      setProgramDataFolder("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to reset program data folder: ${message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Program data folder
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Location for storing competition data and temporary downloads
            </p>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={selectFolder}
                disabled={isMigrating}
                className="border border-gray-300 px-2 py-1 font-medium text-sm rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                {isMigrating
                  ? "Migrating..."
                  : !programDataFolder
                    ? "Select Folder"
                    : "Change Folder"}
              </button>
              {programDataFolder && (
                <button
                  onClick={resetFolder}
                  disabled={isMigrating}
                  className="border border-gray-300 px-2 py-1 font-medium text-sm rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  Reset to Default
                </button>
              )}
            </div>
            <p className="text-sm text-gray-700">
              {programDataFolder || defaultStoragePath || "Loading..."}
              {!programDataFolder && defaultStoragePath && (
                <span className="text-gray-500"> (default)</span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FlymasterCredentialsForm />
            <XContestCredentialsForm />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Scoring page with provider wrapper
 */
const Scoring: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div id="application">
      <div className="min-w-full relative bg-zinc-100 rounded-md border-2 border-gray-200 shadow-md mt-6 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Competitions</h1>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 transition-colors"
              title="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
          <Link
            to="/igc-downloader"
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            IGC Downloader
          </Link>
        </div>
        <ScoringContent />
      </div>
      {showSettings && (
        <DataFolderSettingsDialog onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default Scoring;
