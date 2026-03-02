/**
 * Competitions list page - Competition management
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  useCompetition,
  CompetitionProvider,
} from "@renderer/context/competitionContext";
import Card from "@components/layout/Card";

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
 * Scoring page with provider wrapper
 */
const Scoring: React.FC = () => {
  return (
    <CompetitionProvider>
      <div id="application">
        <div className="min-w-full relative bg-zinc-100 rounded-md border-2 border-gray-200 shadow-md mt-6 p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Competitions</h1>
            <Link to="/" className="text-sm text-blue-600 hover:underline">
              Back to Track Downloader
            </Link>
          </div>
          <ScoringContent />
        </div>
      </div>
    </CompetitionProvider>
  );
};

export default Scoring;
