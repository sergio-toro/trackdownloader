import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSettings } from "./settingsContext";
import type {
  Competition,
  CompetitionSummary,
  CreateCompetitionData,
  TaskDefinition,
  Participant,
  TaskResult,
  CompetitionResult,
  ScoringFormulaConfig,
} from "@main/scoring/types";

/**
 * Progress state for long-running operations
 */
export interface ProgressState {
  visible: boolean;
  percent: number;
  detail: string | null;
}

/**
 * Competition context state
 */
export interface CompetitionState {
  // Current competition data
  competition: Competition | null;
  tasks: TaskDefinition[];
  activeTaskId: string | null;
  participants: Participant[];

  // Results
  taskResults: Record<string, TaskResult>;
  competitionResults: CompetitionResult | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  scoringProgress: ProgressState;

  // Recent competitions for quick access
  recentCompetitions: CompetitionSummary[];

  // Competition management
  createCompetition: (data: CreateCompetitionData) => Promise<string | null>;
  loadCompetition: (id: string) => Promise<void>;
  updateCompetition: (updates: Partial<Competition>) => Promise<void>;
  closeCompetition: () => void;
  refreshCompetitions: () => Promise<void>;

  // Task management
  addTask: (task: TaskDefinition) => Promise<void>;
  updateTask: (
    taskId: string,
    updates: Partial<TaskDefinition>
  ) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setActiveTask: (taskId: string | null) => void;
  reorderTasks: (taskIds: string[]) => Promise<void>;

  // Participant management
  addParticipant: (participant: Participant) => Promise<void>;
  updateParticipant: (
    participantId: number,
    updates: Partial<Participant>
  ) => Promise<void>;
  deleteParticipant: (participantId: number) => Promise<void>;
  setParticipants: (participants: Participant[]) => Promise<void>;

  // Results
  loadTaskResults: (taskId: string) => Promise<TaskResult | null>;
  loadCompetitionResults: () => Promise<CompetitionResult | null>;

  // Formula
  updateFormula: (formula: Partial<ScoringFormulaConfig>) => Promise<void>;

  // UI
  clearError: () => void;
  setScoringProgress: (progress: ProgressState) => void;
}

const initialProgress: ProgressState = {
  visible: false,
  percent: 0,
  detail: null,
};

const initialContext: CompetitionState = {
  competition: null,
  tasks: [],
  activeTaskId: null,
  participants: [],
  taskResults: {},
  competitionResults: null,
  isLoading: false,
  error: null,
  scoringProgress: initialProgress,
  recentCompetitions: [],

  // No-op functions for initial context
  createCompetition: async () => null,
  loadCompetition: async () => {},
  updateCompetition: async () => {},
  closeCompetition: () => {},
  refreshCompetitions: async () => {},
  addTask: async () => {},
  updateTask: async () => {},
  deleteTask: async () => {},
  setActiveTask: () => {},
  reorderTasks: async () => {},
  addParticipant: async () => {},
  updateParticipant: async () => {},
  deleteParticipant: async () => {},
  setParticipants: async () => {},
  loadTaskResults: async () => null,
  loadCompetitionResults: async () => null,
  updateFormula: async () => {},
  clearError: () => {},
  setScoringProgress: () => {},
};

const CompetitionContext = createContext<CompetitionState>(initialContext);

/**
 * Hook to access competition context
 */
export const useCompetition = () => useContext(CompetitionContext);

const LOCAL_STORAGE_KEY = "competition";

interface StoredState {
  competitionId: string | null;
  activeTaskId: string | null;
  recentCompetitionIds: string[];
}

/**
 * Competition context provider
 */
export const CompetitionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { settings } = useSettings();

  // State
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [taskResults, setTaskResults] = useState<Record<string, TaskResult>>(
    {}
  );
  const [competitionResults, setCompetitionResults] =
    useState<CompetitionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringProgress, setScoringProgress] =
    useState<ProgressState>(initialProgress);
  const [recentCompetitions, setRecentCompetitions] = useState<
    CompetitionSummary[]
  >([]);

  // Load stored state on mount
  useEffect(() => {
    const loadStoredState = async () => {
      try {
        // Ensure custom storage path is set before loading competitions.
        // SettingsProvider (parent) sets programDataFolder from localStorage,
        // but its useEffect to call setStoragePath races with this effect.
        if (settings.programDataFolder) {
          await window.scoring.setStoragePath(
            settings.programDataFolder,
            false
          );
        }

        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const state: StoredState = JSON.parse(stored);

          // Load recent competitions
          await refreshCompetitionsInternal();

          // Load last active competition if available
          if (state.competitionId) {
            await loadCompetitionInternal(state.competitionId);
            if (state.activeTaskId) {
              setActiveTaskId(state.activeTaskId);
            }
          }
        } else {
          // Just load competition list
          await refreshCompetitionsInternal();
        }
      } catch (err) {
        console.error("Error loading stored state:", err);
      }
    };

    loadStoredState();
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    const state: StoredState = {
      competitionId: competition?.id || null,
      activeTaskId,
      recentCompetitionIds: recentCompetitions.map((c) => c.id).slice(0, 10),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [competition?.id, activeTaskId, recentCompetitions]);

  // Internal helper functions

  const refreshCompetitionsInternal = async () => {
    try {
      const list = await window.scoring.listCompetitions();
      setRecentCompetitions(list);
    } catch (err) {
      console.error("Error refreshing competitions:", err);
    }
  };

  const loadCompetitionInternal = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const comp = await window.scoring.loadCompetition(id);
      if (comp) {
        setCompetition(comp);
        // Apply saved task order if available
        if (comp.taskOrder && comp.taskOrder.length > 0) {
          const orderMap = new Map(comp.taskOrder.map((id, idx) => [id, idx]));
          const sorted = [...comp.tasks].sort((a, b) => {
            const ai = orderMap.get(a.id);
            const bi = orderMap.get(b.id);
            if (ai !== undefined && bi !== undefined) return ai - bi;
            if (ai !== undefined) return -1;
            if (bi !== undefined) return 1;
            return 0;
          });
          setTasks(sorted);
        } else {
          setTasks(comp.tasks);
        }
        setParticipants(comp.participants);
        setTaskResults({});
        setCompetitionResults(null);

        // Set first task as active if none selected
        if (comp.tasks.length > 0 && !activeTaskId) {
          setActiveTaskId(comp.tasks[0].id);
        }
      } else {
        setError(`Competition not found: ${id}`);
      }
    } catch (err) {
      setError(`Failed to load competition: ${err}`);
      console.error("Error loading competition:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Public context methods

  const createCompetition = useCallback(
    async (data: CreateCompetitionData): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const id = await window.scoring.createCompetition(data);
        await refreshCompetitionsInternal();
        await loadCompetitionInternal(id);
        return id;
      } catch (err) {
        setError(`Failed to create competition: ${err}`);
        console.error("Error creating competition:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loadCompetition = useCallback(async (id: string) => {
    await loadCompetitionInternal(id);
  }, []);

  const updateCompetition = useCallback(
    async (updates: Partial<Competition>) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.updateCompetition(competition.id, updates);
        setCompetition((prev) => (prev ? { ...prev, ...updates } : null));
        await refreshCompetitionsInternal();
      } catch (err) {
        setError(`Failed to update competition: ${err}`);
        console.error("Error updating competition:", err);
      }
    },
    [competition]
  );

  const closeCompetition = useCallback(() => {
    setCompetition(null);
    setTasks([]);
    setActiveTaskId(null);
    setParticipants([]);
    setTaskResults({});
    setCompetitionResults(null);
    setError(null);
  }, []);

  const refreshCompetitions = useCallback(async () => {
    await refreshCompetitionsInternal();
  }, []);

  // Task management

  const addTask = useCallback(
    async (task: TaskDefinition) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.addTask(competition.id, task);
        setTasks((prev) => [...prev, task]);
        setActiveTaskId(task.id);
      } catch (err) {
        setError(`Failed to add task: ${err}`);
        console.error("Error adding task:", err);
      }
    },
    [competition]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<TaskDefinition>) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.updateTask(competition.id, taskId, updates);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
        );
      } catch (err) {
        setError(`Failed to update task: ${err}`);
        console.error("Error updating task:", err);
      }
    },
    [competition]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.deleteTask(competition.id, taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        if (activeTaskId === taskId) {
          setActiveTaskId(
            tasks.length > 1
              ? tasks.find((t) => t.id !== taskId)?.id || null
              : null
          );
        }
        // Remove cached results
        setTaskResults((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [taskId]: _removed, ...rest } = prev;
          return rest;
        });
      } catch (err) {
        setError(`Failed to delete task: ${err}`);
        console.error("Error deleting task:", err);
      }
    },
    [competition, activeTaskId, tasks]
  );

  const reorderTasks = useCallback(
    async (taskIds: string[]) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.updateCompetition(competition.id, {
          taskOrder: taskIds,
        });
        setCompetition((prev) =>
          prev ? { ...prev, taskOrder: taskIds } : null
        );
        // Reorder the tasks state to match
        setTasks((prev) => {
          const taskMap = new Map(prev.map((t) => [t.id, t]));
          const ordered: TaskDefinition[] = [];
          for (const id of taskIds) {
            const t = taskMap.get(id);
            if (t) ordered.push(t);
          }
          // Append any tasks not in taskIds (shouldn't happen, but safe)
          for (const t of prev) {
            if (!taskIds.includes(t.id)) ordered.push(t);
          }
          return ordered;
        });
      } catch (err) {
        setError(`Failed to reorder tasks: ${err}`);
        console.error("Error reordering tasks:", err);
      }
    },
    [competition]
  );

  const setActiveTask = useCallback((taskId: string | null) => {
    setActiveTaskId(taskId);
  }, []);

  // Participant management

  const addParticipant = useCallback(
    async (participant: Participant) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.addParticipant(competition.id, participant);
        setParticipants((prev) => [...prev, participant]);
      } catch (err) {
        setError(`Failed to add participant: ${err}`);
        console.error("Error adding participant:", err);
      }
    },
    [competition]
  );

  const updateParticipant = useCallback(
    async (participantId: number, updates: Partial<Participant>) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.updateParticipant(
          competition.id,
          participantId,
          updates
        );
        setParticipants((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, ...updates } : p))
        );
      } catch (err) {
        setError(`Failed to update participant: ${err}`);
        console.error("Error updating participant:", err);
      }
    },
    [competition]
  );

  const deleteParticipant = useCallback(
    async (participantId: number) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.deleteParticipant(competition.id, participantId);
        setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      } catch (err) {
        setError(`Failed to delete participant: ${err}`);
        console.error("Error deleting participant:", err);
      }
    },
    [competition]
  );

  const setParticipantsData = useCallback(
    async (newParticipants: Participant[]) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.setParticipants(competition.id, newParticipants);
        setParticipants(newParticipants);
      } catch (err) {
        setError(`Failed to set participants: ${err}`);
        console.error("Error setting participants:", err);
      }
    },
    [competition]
  );

  // Results

  const loadTaskResults = useCallback(
    async (taskId: string): Promise<TaskResult | null> => {
      if (!competition) return null;
      try {
        // Check cache first
        if (taskResults[taskId]) {
          return taskResults[taskId];
        }

        const results = await window.scoring.getTaskResults(
          competition.id,
          taskId
        );
        if (results) {
          setTaskResults((prev) => ({ ...prev, [taskId]: results }));
        }
        return results;
      } catch (err) {
        console.error("Error loading task results:", err);
        return null;
      }
    },
    [competition, taskResults]
  );

  const loadCompetitionResults =
    useCallback(async (): Promise<CompetitionResult | null> => {
      if (!competition) return null;
      try {
        const results = await window.scoring.getCompetitionResults(
          competition.id
        );
        if (results) {
          setCompetitionResults(results);
        }
        return results;
      } catch (err) {
        console.error("Error loading competition results:", err);
        return null;
      }
    }, [competition]);

  // Formula

  const updateFormula = useCallback(
    async (formula: Partial<ScoringFormulaConfig>) => {
      if (!competition) return;
      setError(null);
      try {
        await window.scoring.updateFormula(competition.id, formula);
        setCompetition((prev) =>
          prev
            ? {
                ...prev,
                formula: { ...prev.formula, ...formula },
              }
            : null
        );
      } catch (err) {
        setError(`Failed to update formula: ${err}`);
        console.error("Error updating formula:", err);
      }
    },
    [competition]
  );

  // UI

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue: CompetitionState = {
    competition,
    tasks,
    activeTaskId,
    participants,
    taskResults,
    competitionResults,
    isLoading,
    error,
    scoringProgress,
    recentCompetitions,
    createCompetition,
    loadCompetition,
    updateCompetition,
    closeCompetition,
    refreshCompetitions,
    addTask,
    updateTask,
    deleteTask,
    setActiveTask,
    reorderTasks,
    addParticipant,
    updateParticipant,
    deleteParticipant,
    setParticipants: setParticipantsData,
    loadTaskResults,
    loadCompetitionResults,
    updateFormula,
    clearError,
    setScoringProgress,
  };

  return (
    <CompetitionContext.Provider value={contextValue}>
      {children}
    </CompetitionContext.Provider>
  );
};
