/**
 * Competition detail page - View tasks, participants, results, and standings
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCompetition } from "@renderer/context/competitionContext";
import CompetitionHeader from "@components/competition/CompetitionHeader";
import TaskList from "@components/competition/TaskList";
import ParticipantTable from "@components/participants/ParticipantTable";
import TaskDetailView from "@components/competition/TaskDetailView";
import TaskResultsTable from "@components/results/TaskResultsTable";
import CompetitionStandings from "@components/results/CompetitionStandings";
import CategorySelector from "@components/results/CategorySelector";
import TeamStandings from "@components/results/TeamStandings";
import ExportDialog from "@components/export/ExportDialog";
import TaskEditorDialog from "@components/scoring/TaskEditorDialog";
import ImportXctskDialog from "@components/scoring/ImportXctskDialog";
import FormulaEditorDialog from "@components/scoring/FormulaEditorDialog";
import CompetitionEditorDialog from "@components/competition/CompetitionEditorDialog";
import CategoryEditorDialog from "@components/competition/CategoryEditorDialog";
import TeamEditorDialog from "@components/competition/TeamEditorDialog";
import type {
  TaskResult,
  CompetitionResult,
  CompetitionCategory,
  TeamDefinition,
  TeamResult,
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
    reorderTasks,
    updateCompetition,
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
  const [showCompetitionEditor, setShowCompetitionEditor] = useState(false);
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<
    string | null
  >(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [categoryTaskResults, setCategoryTaskResults] = useState<
    Record<string, Record<string, TaskResult>>
  >({});
  const [categoryStandings, setCategoryStandings] = useState<
    Record<string, CompetitionResult>
  >({});
  const [teamResults, setTeamResults] = useState<Record<string, TeamResult>>(
    {}
  );
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showTeamEditor, setShowTeamEditor] = useState(false);
  const [standingsVersion, setStandingsVersion] = useState(0);

  // Load competition on mount
  useEffect(() => {
    if (competitionId && (!competition || competition.id !== competitionId)) {
      loadCompetition(competitionId);
    }
  }, [competitionId, competition, loadCompetition]);

  // Hydrate results for previously-scored tasks on load
  const loadedResultsForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!competitionId || tasks.length === 0) return;
    if (loadedResultsForRef.current === competitionId) return;

    const scoredTasks = tasks.filter((t) => t.scoredAt);
    if (scoredTasks.length === 0) return;

    loadedResultsForRef.current = competitionId;

    const loadAllResults = async () => {
      try {
        const entries = await Promise.all(
          scoredTasks.map(async (task) => {
            const result = await window.scoring.getTaskResults(
              competitionId,
              task.id
            );
            return [task.id, result] as const;
          })
        );
        const loaded: Record<string, TaskResult> = {};
        for (const [taskId, result] of entries) {
          if (result) loaded[taskId] = result;
        }
        if (Object.keys(loaded).length > 0) {
          setTaskResults((prev) => ({ ...prev, ...loaded }));
        }
      } catch (err) {
        console.error("Failed to load scored task results:", err);
      }
    };

    loadAllResults();
  }, [competitionId, tasks]);

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

  // Load standings (always recalculates to cascade category/team results)
  const loadStandings = useCallback(async () => {
    if (!competitionId) return;
    try {
      const result = await window.scoring.calculateStandings(competitionId);
      setCompetitionResult(result);
      // Invalidate cached category/team standings — version bump triggers re-fetch
      setCategoryStandings({});
      setCategoryTaskResults({});
      setTeamResults({});
      setStandingsVersion((v) => v + 1);
    } catch (err) {
      console.error("Failed to load standings:", err);
    }
  }, [competitionId]);

  // Load category task results
  const loadCategoryTaskResults = useCallback(
    async (taskId: string, categoryId: string) => {
      try {
        const result = await window.scoring.getCategoryTaskResults(
          competitionId!,
          taskId,
          categoryId
        );
        if (result) {
          setCategoryTaskResults((prev) => ({
            ...prev,
            [categoryId]: { ...prev[categoryId], [taskId]: result },
          }));
        }
      } catch (err) {
        console.error("Failed to load category task results:", err);
      }
    },
    [competitionId]
  );

  // Load category standings
  const loadCategoryStandings = useCallback(
    async (categoryId: string) => {
      try {
        const result = await window.scoring.getCategoryStandings(
          competitionId!,
          categoryId
        );
        if (result) {
          setCategoryStandings((prev) => ({
            ...prev,
            [categoryId]: result,
          }));
        }
      } catch (err) {
        console.error("Failed to load category standings:", err);
      }
    },
    [competitionId]
  );

  // Load team results
  const loadTeamResults = useCallback(
    async (teamDefId: string) => {
      try {
        const result = await window.scoring.getTeamResults(
          competitionId!,
          teamDefId
        );
        if (result) {
          setTeamResults((prev) => ({ ...prev, [teamDefId]: result }));
        }
      } catch (err) {
        console.error("Failed to load team results:", err);
      }
    },
    [competitionId]
  );

  // Load existing standings when switching to standings tab
  const loadExistingStandings = useCallback(async () => {
    if (!competitionId) return;
    try {
      let result = await window.scoring.getCompetitionResults(competitionId);
      if (!result) {
        result = await window.scoring.calculateStandings(competitionId);
      }
      setCompetitionResult(result);
    } catch (err) {
      console.error("Failed to load standings:", err);
    }
  }, [competitionId]);

  useEffect(() => {
    if (activeTab === "standings" && !competitionResult) {
      loadExistingStandings();
    }
  }, [activeTab, competitionResult, loadExistingStandings]);

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

  // Load category data when category is selected or standings recalculated
  useEffect(() => {
    if (!selectedCategoryId || !competitionId) return;
    if (activeTab === "standings") {
      loadCategoryStandings(selectedCategoryId);
    }
    if (activeTab === "results" && selectedTaskId) {
      loadCategoryTaskResults(selectedTaskId, selectedCategoryId);
    }
  }, [
    activeTab,
    selectedCategoryId,
    selectedTaskId,
    competitionId,
    standingsVersion,
    loadCategoryStandings,
    loadCategoryTaskResults,
  ]);

  // Load team results when on standings tab
  useEffect(() => {
    if (activeTab === "standings" && competition?.teams?.length) {
      for (const teamDef of competition.teams) {
        loadTeamResults(teamDef.id);
      }
    }
  }, [activeTab, competition?.teams, standingsVersion, loadTeamResults]);

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

  const selectedDetailTask = selectedDetailTaskId
    ? (tasks.find((t) => t.id === selectedDetailTaskId) ?? null)
    : null;

  const handleScoreTaskForDetail = async (taskId: string) => {
    try {
      const result = await window.scoring.scoreTask(competitionId!, taskId);
      setTaskResults((prev) => ({ ...prev, [taskId]: result }));
    } catch (err) {
      console.error("Failed to score task:", err);
    }
  };

  return (
    <div id="application">
      <div className="min-w-full relative bg-zinc-100 rounded-md border-2 border-gray-200 shadow-md mt-6 p-4">
        {selectedDetailTask ? (
          /* Full-page task detail view */
          <TaskDetailView
            task={selectedDetailTask}
            taskResult={taskResults[selectedDetailTask.id]}
            participants={participants}
            competitionId={competitionId!}
            competitionName={competition.name}
            categories={competition.categories ?? []}
            onBack={() => setSelectedDetailTaskId(null)}
            onEditTask={handleEditTask}
            onScoreTask={handleScoreTaskForDetail}
          />
        ) : (
          <>
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
              onEditCompetition={() => setShowCompetitionEditor(true)}
              onEditCategories={() => setShowCategoryEditor(true)}
              onEditTeams={() => setShowTeamEditor(true)}
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
                  onScoreTask={handleScoreTaskForDetail}
                  onViewResults={(taskId) => {
                    setSelectedTaskId(taskId);
                    setActiveTab("results");
                  }}
                  onSelectTaskDetail={(taskId) =>
                    setSelectedDetailTaskId(taskId)
                  }
                  onDeleteTask={async (taskId) => {
                    await deleteTask(taskId);
                    setTaskResults((prev) => {
                      const next = { ...prev };
                      delete next[taskId];
                      return next;
                    });
                  }}
                  onReorderTasks={reorderTasks}
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
                  <CategorySelector
                    categories={competition.categories ?? []}
                    selectedCategoryId={selectedCategoryId}
                    onChange={setSelectedCategoryId}
                  />
                  <h3 className="text-lg font-semibold mb-4">
                    {selectedCategoryId
                      ? `${competition.categories?.find((c) => c.id === selectedCategoryId)?.name ?? ""} Standings`
                      : "Overall Standings"}
                  </h3>
                  <CompetitionStandings
                    competitionResult={
                      selectedCategoryId
                        ? (categoryStandings[selectedCategoryId] ?? null)
                        : competitionResult
                    }
                    taskResults={Object.values(taskResults)}
                    participants={participants}
                    onRecalculate={loadStandings}
                  />

                  {/* Team standings */}
                  {!selectedCategoryId &&
                    competition.teams?.map((teamDef) => (
                      <div key={teamDef.id} className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">
                          {teamDef.name}
                        </h3>
                        <TeamStandings
                          teamResult={teamResults[teamDef.id] ?? null}
                          participants={participants}
                          taskNames={new Map(tasks.map((t) => [t.id, t.name]))}
                        />
                      </div>
                    ))}
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

                  {/* Category selector */}
                  <CategorySelector
                    categories={competition.categories ?? []}
                    selectedCategoryId={selectedCategoryId}
                    onChange={setSelectedCategoryId}
                  />

                  {/* Results table */}
                  {selectedTaskId &&
                  (selectedCategoryId
                    ? categoryTaskResults[selectedCategoryId]?.[selectedTaskId]
                    : taskResults[selectedTaskId]) ? (
                    <TaskResultsTable
                      taskResult={
                        selectedCategoryId
                          ? categoryTaskResults[selectedCategoryId][
                              selectedTaskId
                            ]
                          : taskResults[selectedTaskId]
                      }
                      participants={participants}
                    />
                  ) : selectedTaskId ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">Task not scored yet</p>
                      <button
                        onClick={() => handleScoreTaskForDetail(selectedTaskId)}
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
          </>
        )}

        {/* Dialogs — always rendered outside the conditional */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          competitionId={competitionId!}
          competitionName={competition.name}
          hasCategories={(competition.categories?.length ?? 0) > 0}
          hasTeams={(competition.teams?.length ?? 0) > 0}
        />

        <TaskEditorDialog
          isOpen={showTaskEditor}
          onClose={() => {
            setShowTaskEditor(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
          existingTask={editingTask}
        />

        <ImportXctskDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={handleTaskImport}
        />

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

        {competition && (
          <CompetitionEditorDialog
            isOpen={showCompetitionEditor}
            onClose={() => setShowCompetitionEditor(false)}
            competition={competition}
            onSave={updateCompetition}
          />
        )}

        {competition && (
          <CategoryEditorDialog
            isOpen={showCategoryEditor}
            onClose={() => setShowCategoryEditor(false)}
            categories={competition.categories ?? []}
            onSave={async (
              categories: CompetitionCategory[],
              renameMap: Record<string, string>
            ) => {
              if (Object.keys(renameMap).length > 0 && competition) {
                await window.scoring.renameCategoryIds(
                  competition.id,
                  renameMap
                );
              }
              await updateCompetition({ categories });
              setCategoryTaskResults({});
              setCategoryStandings({});
              setSelectedCategoryId(null);
            }}
          />
        )}

        {competition && (
          <TeamEditorDialog
            isOpen={showTeamEditor}
            onClose={() => setShowTeamEditor(false)}
            teams={competition.teams ?? []}
            onSave={async (
              teams: TeamDefinition[],
              renameMap: Record<string, string>
            ) => {
              if (Object.keys(renameMap).length > 0 && competition) {
                await window.scoring.renameTeamIds(competition.id, renameMap);
              }
              await updateCompetition({ teams });
              setTeamResults({});
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Competition;
