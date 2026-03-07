/**
 * Competition detail page - View tasks, participants, results, and standings
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCompetition } from "@renderer/context/competitionContext";
import CompetitionHeader from "@components/competition/CompetitionHeader";
import TaskList from "@components/competition/TaskList";
import ParticipantTable from "@components/participants/ParticipantTable";
import TaskResultsTable from "@components/results/TaskResultsTable";
import CompetitionStandings from "@components/results/CompetitionStandings";
import ExportDialog from "@components/export/ExportDialog";
import TaskEditorDialog from "@components/scoring/TaskEditorDialog";
import ImportXctskDialog from "@components/scoring/ImportXctskDialog";
import FormulaEditorDialog from "@components/scoring/FormulaEditorDialog";
import type {
  TaskResult,
  CompetitionResult,
  TaskDefinition,
  ScoringFormulaConfig,
} from "@main/scoring/types";

type TabType = "tasks" | "participants" | "results" | "standings";

const Competition: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const {
    competition,
    tasks,
    participants,
    loadCompetition,
    isLoading,
    error,
    clearError,
    addTask,
    updateTask,
    deleteTask,
    updateFormula,
  } = useCompetition();

  const [activeTab, setActiveTab] = useState<TabType>("standings");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskResults, setTaskResults] = useState<Record<string, TaskResult>>(
    {}
  );
  const [competitionResult, setCompetitionResult] =
    useState<CompetitionResult | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);

  // Load competition on mount
  useEffect(() => {
    if (competitionId && (!competition || competition.id !== competitionId)) {
      loadCompetition(competitionId);
    }
  }, [competitionId, competition, loadCompetition]);

  // Load task results
  const loadTaskResults = useCallback(
    async (taskId: string) => {
      try {
        const result = await window.scoring.getTaskResults(
          competitionId!,
          taskId
        );
        if (result) {
          setTaskResults((prev) => ({ ...prev, [taskId]: result }));
        }
      } catch (err) {
        console.error("Failed to load task results:", err);
      }
    },
    [competitionId]
  );

  // Load standings
  const loadStandings = useCallback(async () => {
    if (!competitionId) return;
    try {
      let result = await window.scoring.getCompetitionResults(competitionId);
      if (!result) {
        // Calculate standings if not yet computed
        result = await window.scoring.calculateStandings(competitionId);
      }
      setCompetitionResult(result);
    } catch (err) {
      console.error("Failed to load standings:", err);
    }
  }, [competitionId]);

  // Load results when switching to standings tab
  useEffect(() => {
    if (activeTab === "standings" && !competitionResult) {
      loadStandings();
    }
  }, [activeTab, competitionResult, loadStandings]);

  // Load task result when selecting a task in results tab
  useEffect(() => {
    if (
      activeTab === "results" &&
      selectedTaskId &&
      !taskResults[selectedTaskId]
    ) {
      loadTaskResults(selectedTaskId);
    }
  }, [activeTab, selectedTaskId, taskResults, loadTaskResults]);

  // Set initial selected task
  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  // Task management handlers
  const handleAddTask = () => {
    setEditingTask(null);
    setShowTaskEditor(true);
  };

  const handleImportTask = () => {
    setShowImportDialog(true);
  };

  const handleEditTask = (task: TaskDefinition) => {
    setEditingTask(task);
    setShowTaskEditor(true);
  };

  const handleSaveTask = async (task: TaskDefinition) => {
    if (editingTask) {
      await updateTask(task.id, task);
    } else {
      await addTask(task);
    }
    setShowTaskEditor(false);
    setEditingTask(null);
  };

  const handleTaskImport = async (task: TaskDefinition) => {
    await addTask(task);
    setShowImportDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading competition...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          <p className="font-medium">Error loading competition</p>
          <p className="text-sm">{error}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={clearError}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            >
              Dismiss
            </button>
            <Link
              to="/"
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
            >
              Back to Competitions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Competition not found</p>
        <Link to="/" className="text-blue-600 hover:underline">
          Back to Competitions
        </Link>
      </div>
    );
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: "standings", label: "Standings" },
    { key: "results", label: "Results" },
    { key: "tasks", label: "Tasks" },
    { key: "participants", label: "Participants" },
  ];

  const scoredTaskCount = Object.keys(taskResults).length;

  return (
    <div id="application">
      <div className="min-w-full relative bg-zinc-100 rounded-md border-2 border-gray-200 shadow-md mt-6 p-4">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Competitions
          </button>
        </div>

        {/* Header */}
        <CompetitionHeader
          competition={competition}
          taskCount={tasks.length}
          scoredTaskCount={scoredTaskCount}
          participantCount={participants.length}
          onExport={() => setShowExportDialog(true)}
          onEditFormula={() => setShowFormulaEditor(true)}
        />

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="min-h-[400px]">
          {activeTab === "tasks" && (
            <TaskList
              tasks={tasks}
              taskResults={taskResults}
              participants={participants}
              competitionId={competitionId!}
              onAddTask={handleAddTask}
              onImportTask={handleImportTask}
              onEditTask={handleEditTask}
              onScoreTask={async (taskId) => {
                try {
                  const result = await window.scoring.scoreTask(
                    competitionId!,
                    taskId
                  );
                  setTaskResults((prev) => ({ ...prev, [taskId]: result }));
                } catch (err) {
                  console.error("Failed to score task:", err);
                }
              }}
              onViewResults={(taskId) => {
                setSelectedTaskId(taskId);
                setActiveTab("results");
              }}
              onDeleteTask={async (taskId) => {
                await deleteTask(taskId);
                setTaskResults((prev) => {
                  const next = { ...prev };
                  delete next[taskId];
                  return next;
                });
              }}
            />
          )}

          {activeTab === "participants" && (
            <ParticipantTable
              competitionId={competitionId!}
              participants={participants}
            />
          )}

          {activeTab === "standings" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Overall Standings</h3>
              <CompetitionStandings
                competitionResult={competitionResult}
                taskResults={Object.values(taskResults)}
                participants={participants}
                onRecalculate={loadStandings}
              />
            </div>
          )}

          {activeTab === "results" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Task Results</h3>
              {/* Task selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${
                      selectedTaskId === task.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {task.name}
                  </button>
                ))}
              </div>

              {/* Results table */}
              {selectedTaskId && taskResults[selectedTaskId] ? (
                <TaskResultsTable
                  taskResult={taskResults[selectedTaskId]}
                  participants={participants}
                />
              ) : selectedTaskId ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Task not scored yet</p>
                  <button
                    onClick={async () => {
                      try {
                        const result = await window.scoring.scoreTask(
                          competitionId!,
                          selectedTaskId
                        );
                        setTaskResults((prev) => ({
                          ...prev,
                          [selectedTaskId]: result,
                        }));
                      } catch (err) {
                        console.error("Failed to score task:", err);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Score Task
                  </button>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Select a task to view results
                </p>
              )}
            </div>
          )}
        </div>

        {/* Export dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          competitionId={competitionId!}
          competitionName={competition.name}
        />

        {/* Task Editor Dialog */}
        <TaskEditorDialog
          isOpen={showTaskEditor}
          onClose={() => {
            setShowTaskEditor(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
          existingTask={editingTask}
        />

        {/* Import Task Dialog */}
        <ImportXctskDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={handleTaskImport}
        />

        {/* Formula Editor Dialog */}
        {competition && (
          <FormulaEditorDialog
            isOpen={showFormulaEditor}
            onClose={() => setShowFormulaEditor(false)}
            formula={competition.formula}
            onSave={async (formula: Partial<ScoringFormulaConfig>) => {
              await updateFormula(formula);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Competition;
