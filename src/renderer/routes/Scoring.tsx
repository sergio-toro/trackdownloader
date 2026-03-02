/**
 * Scoring page - Competition management and task import
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  useCompetition,
  CompetitionProvider,
} from "@renderer/context/competitionContext";
import Card from "@components/layout/Card";
import {
  ImportXctskDialog,
  TaskSummary,
  WaypointTable,
  TaskEditorDialog,
} from "@components/scoring";
import type { TaskDefinition, Turnpoint } from "@main/scoring/types";

/**
 * Competition list view
 */
const CompetitionList: React.FC = () => {
  const {
    recentCompetitions,
    loadCompetition,
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
              onClick={() => loadCompetition(comp.id)}
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
 * Active competition view
 */
/**
 * Calculate task distances using the main process
 * This is a simplified version - in production, this should be done via IPC
 */
function calculateTaskDistances(
  turnpoints: Turnpoint[],
  _ssIndex: number,
  _esIndex: number
) {
  // For now, return placeholder values - the actual calculation
  // will happen when the task is saved via the context
  // The shortestRoute.ts module handles this in the main process
  return {
    taskDistance: 0,
    speedSectionDistance: 0,
    launchToEssDistance: 0,
    legDistances: [] as number[],
    shortestRoute: turnpoints.map((tp) => tp.geopoint),
  };
}

const CompetitionView: React.FC = () => {
  const {
    competition,
    tasks,
    activeTaskId,
    setActiveTask,
    addTask,
    updateTask,
    closeCompetition,
  } = useCompetition();
  const navigate = useNavigate();

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null);

  if (!competition) return null;

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  const handleImportTask = async (task: TaskDefinition) => {
    await addTask(task);
    setShowImportDialog(false);
  };

  const handleSaveTask = async (task: TaskDefinition) => {
    // Calculate distances before saving
    const ssIndex = task.turnpoints.findIndex((tp) => tp.type === "SSS") + 1;
    const esIndex = task.turnpoints.findIndex((tp) => tp.type === "ESS") + 1;
    const distances = calculateTaskDistances(task.turnpoints, ssIndex, esIndex);

    const taskWithDistances: TaskDefinition = {
      ...task,
      ssIndex,
      esIndex,
      ...distances,
    };

    if (editingTask) {
      await updateTask(task.id, taskWithDistances);
    } else {
      await addTask(taskWithDistances);
    }

    setShowTaskEditor(false);
    setEditingTask(null);
  };

  const handleEditTask = (task: TaskDefinition) => {
    setEditingTask(task);
    setShowTaskEditor(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setShowTaskEditor(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={closeCompetition}
            className="text-sm text-blue-600 hover:underline mb-1"
          >
            ← Back to competitions
          </button>
          <h2 className="text-xl font-bold">{competition.name}</h2>
          <p className="text-gray-500">{competition.location}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/competition/${competition.id}`)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium"
          >
            Results & Standings
          </button>
          <button
            onClick={handleNewTask}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
          >
            New Task
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            Import Task (.xctsk)
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 space-y-2">
          <h3 className="font-medium text-gray-700">Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks yet</p>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                    task.id === activeTaskId
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <button
                    onClick={() => setActiveTask(task.id)}
                    className="flex-1 text-left"
                  >
                    <div
                      className={`truncate ${task.id === activeTaskId ? "font-medium" : ""}`}
                    >
                      {task.name}
                    </div>
                    <div className="text-xs text-gray-500">{task.date}</div>
                  </button>
                  <button
                    onClick={() => handleEditTask(task)}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit task"
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
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task details */}
        <div className="col-span-3">
          {activeTask ? (
            <Card title={activeTask.name}>
              <TaskSummary task={activeTask} />
              <div className="mt-4 border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">Turnpoints</h4>
                <WaypointTable
                  turnpoints={activeTask.turnpoints}
                  ssIndex={activeTask.ssIndex}
                  esIndex={activeTask.esIndex}
                />
              </div>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">
                {tasks.length === 0
                  ? "Import a task to get started"
                  : "Select a task to view details"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Import dialog */}
      <ImportXctskDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportTask}
      />

      {/* Task editor dialog */}
      <TaskEditorDialog
        isOpen={showTaskEditor}
        onClose={() => {
          setShowTaskEditor(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        existingTask={editingTask}
      />
    </div>
  );
};

/**
 * Main scoring content (switches between list and detail view)
 */
const ScoringContent: React.FC = () => {
  const { competition } = useCompetition();

  return competition ? <CompetitionView /> : <CompetitionList />;
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
            <h1 className="text-2xl font-bold">Competition Scoring</h1>
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
