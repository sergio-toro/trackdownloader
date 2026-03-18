/**
 * TaskEditorDialog - Modal dialog for creating and editing tasks
 */

import React, { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { toSlug } from "@main/scoring/utils/slug";
import TurnpointEditor, { waypointToTurnpoint } from "./TurnpointEditor";
import StartGateEditor from "./StartGateEditor";
import WaypointLibraryPanel from "./WaypointLibraryPanel";
import type {
  TaskDefinition,
  Turnpoint,
  StartGate,
  TaskType,
  EarthModel,
  GoalType,
  TaskState,
  LibraryWaypoint,
  TurnpointType,
} from "@main/scoring/types";

interface TaskEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskDefinition) => Promise<void>;
  existingTask?: TaskDefinition | null;
}

interface ValidationErrors {
  name?: string;
  date?: string;
  turnpoints?: string;
  startGates?: string;
  deadline?: string;
}

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "Race", label: "Race to Goal" },
  { value: "TimeTrial", label: "Elapsed Time" },
  { value: "OpenDistance", label: "Open Distance" },
];

const EARTH_MODELS: { value: EarthModel; label: string }[] = [
  { value: "WGS84", label: "WGS84 (Standard)" },
  { value: "FAI_SPHERE", label: "FAI Sphere" },
];

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "CYLINDER", label: "Cylinder" },
  { value: "LINE", label: "Line" },
];

const TaskEditorDialog: React.FC<TaskEditorDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  existingTask,
}) => {
  const isEditMode = !!existingTask;

  // Form state
  const [name, setName] = useState("");
  const [taskId, setTaskId] = useState("");
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [idError, setIdError] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [taskType, setTaskType] = useState<TaskType>("Race");
  const [earthModel, setEarthModel] = useState<EarthModel>("WGS84");
  const [goalType, setGoalType] = useState<GoalType>("CYLINDER");
  const [state, setState] = useState<TaskState>("Regular");
  const [turnpoints, setTurnpoints] = useState<Turnpoint[]>([]);
  const [startGates, setStartGates] = useState<StartGate[]>([]);
  const [deadline, setDeadline] = useState("");
  const [qnhSetting, setQnhSetting] = useState(1013.25);
  const [leadingTimeRatio, setLeadingTimeRatio] = useState(0.26);

  // UI state
  const [showWaypointPanel, setShowWaypointPanel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form from existing task or defaults
  useEffect(() => {
    if (isOpen) {
      if (existingTask) {
        setName(existingTask.name);
        setTaskId(existingTask.id);
        setIdManuallyEdited(false);
        setIdError("");
        setDate(existingTask.date);
        setTaskType(existingTask.taskType);
        setEarthModel(existingTask.earthModel);
        setGoalType(existingTask.goalType);
        setState(existingTask.state);
        setTurnpoints(existingTask.turnpoints);
        setStartGates(existingTask.startGates);
        // Get deadline from last turnpoint's close time
        const lastTp =
          existingTask.turnpoints[existingTask.turnpoints.length - 1];
        setDeadline(
          lastTp?.close ||
            new Date(`${existingTask.date}T18:00:00`).toISOString()
        );
        setQnhSetting(existingTask.qnhSetting);
        setLeadingTimeRatio(existingTask.leadingTimeRatio);
      } else {
        // Reset to defaults for new task
        const today = format(new Date(), "yyyy-MM-dd");
        setName("");
        setTaskId("");
        setIdManuallyEdited(false);
        setIdError("");
        setDate(today);
        setTaskType("Race");
        setEarthModel("WGS84");
        setGoalType("CYLINDER");
        setState("Regular");
        setTurnpoints([]);
        setStartGates([{ open: new Date(`${today}T10:30:00`).toISOString() }]);
        setDeadline(new Date(`${today}T18:00:00`).toISOString());
        setQnhSetting(1013.25);
        setLeadingTimeRatio(0.26);
      }
      setErrors({});
      setShowAdvanced(false);
    }
  }, [isOpen, existingTask]);

  // Validate the form
  const validate = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    if (!name.trim()) {
      newErrors.name = "Task name is required";
    }

    if (!date) {
      newErrors.date = "Task date is required";
    }

    if (turnpoints.length < 4) {
      newErrors.turnpoints =
        "At least 4 turnpoints required (TAKEOFF, SSS, ESS, GOAL)";
    } else {
      // Check for required turnpoint types
      const types = turnpoints.map((tp) => tp.type);
      if (!types.includes("TAKEOFF")) {
        newErrors.turnpoints = "TAKEOFF turnpoint is required";
      } else if (!types.includes("SSS")) {
        newErrors.turnpoints = "SSS (Start) turnpoint is required";
      } else if (!types.includes("ESS")) {
        newErrors.turnpoints = "ESS (End Speed) turnpoint is required";
      } else if (!types.includes("GOAL")) {
        newErrors.turnpoints = "GOAL turnpoint is required";
      } else {
        // Check order: SSS must come before ESS
        const ssIndex = types.indexOf("SSS");
        const esIndex = types.indexOf("ESS");
        const goalIndex = types.indexOf("GOAL");
        if (ssIndex > esIndex) {
          newErrors.turnpoints = "SSS must come before ESS";
        } else if (esIndex > goalIndex) {
          newErrors.turnpoints = "ESS must come before GOAL";
        }
      }

      // Check for valid coordinates
      const invalidTp = turnpoints.find(
        (tp) => tp.geopoint.latitude === 0 && tp.geopoint.longitude === 0
      );
      if (invalidTp && !newErrors.turnpoints) {
        newErrors.turnpoints = "All turnpoints must have valid coordinates";
      }
    }

    if (startGates.length === 0) {
      newErrors.startGates = "At least one start gate is required";
    }

    if (!deadline) {
      newErrors.deadline = "Task deadline is required";
    } else if (startGates.length > 0) {
      const lastGate = startGates[startGates.length - 1];
      if (new Date(deadline) <= new Date(lastGate.open)) {
        newErrors.deadline = "Deadline must be after all start gates";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, date, turnpoints, startGates, deadline]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      // Calculate ssIndex and esIndex from turnpoint types
      const ssIndex = turnpoints.findIndex((tp) => tp.type === "SSS") + 1;
      const esIndex = turnpoints.findIndex((tp) => tp.type === "ESS") + 1;

      // Update turnpoint close times to match deadline
      const updatedTurnpoints = turnpoints.map((tp) => ({
        ...tp,
        close: deadline,
      }));

      // Build task definition (distances will be calculated by main process on save)
      const task: TaskDefinition = {
        id: taskId || toSlug(name.trim()),
        name: name.trim(),
        date,
        taskType,
        earthModel,
        state,
        turnpoints: updatedTurnpoints,
        ssIndex,
        esIndex,
        goalType,
        startGates,
        // Placeholder values - will be recalculated
        taskDistance: existingTask?.taskDistance || 0,
        speedSectionDistance: existingTask?.speedSectionDistance || 0,
        launchToEssDistance: existingTask?.launchToEssDistance || 0,
        legDistances: existingTask?.legDistances || [],
        shortestRoute: existingTask?.shortestRoute || [],
        qnhSetting,
        leadingTimeRatio,
      };

      await onSave(task);
      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
      setErrors({ name: "Failed to save task. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }, [
    validate,
    name,
    date,
    taskType,
    earthModel,
    state,
    turnpoints,
    goalType,
    startGates,
    deadline,
    qnhSetting,
    leadingTimeRatio,
    existingTask,
    onSave,
    onClose,
  ]);

  // Handle adding waypoint from library
  const handleAddWaypoint = useCallback(
    (waypoint: LibraryWaypoint, type: TurnpointType) => {
      const newTurnpoint = waypointToTurnpoint(waypoint, type, date);
      setTurnpoints((prev) => [...prev, newTurnpoint]);
    },
    [date]
  );

  // Handle start gate and deadline changes
  const handleStartGatesChange = useCallback(
    (newGates: StartGate[], newDeadline: string) => {
      setStartGates(newGates);
      setDeadline(newDeadline);
    },
    []
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Dialog */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold">
                {isEditMode
                  ? `Edit Task: ${existingTask?.name}`
                  : "Create New Task"}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Global error */}
              {errors.name && !name.trim() && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {errors.name}
                </div>
              )}

              {/* Basic Info Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 border-b pb-2">
                  Basic Information
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!idManuallyEdited) {
                          setTaskId(toSlug(e.target.value));
                          setIdError("");
                        }
                      }}
                      placeholder="e.g., Task 1 - Race to Goal"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID
                    </label>
                    <input
                      type="text"
                      value={taskId}
                      onChange={(e) => {
                        const sanitized = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "");
                        setTaskId(sanitized);
                        setIdManuallyEdited(true);
                        setIdError("");
                      }}
                      placeholder="auto-generated-from-name"
                      className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                        idError ? "border-red-400" : "border-gray-300"
                      }`}
                    />
                    {idError && (
                      <p className="text-red-500 text-xs mt-1">{idError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Date *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Type
                    </label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as TaskType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {TASK_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Earth Model
                    </label>
                    <select
                      value={earthModel}
                      onChange={(e) =>
                        setEarthModel(e.target.value as EarthModel)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {EARTH_MODELS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Goal Type
                    </label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value as GoalType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {GOAL_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Turnpoints Section */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 border-b pb-2">
                  Turnpoints
                </h4>
                {errors.turnpoints && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {errors.turnpoints}
                  </div>
                )}
                <TurnpointEditor
                  turnpoints={turnpoints}
                  taskDate={date}
                  onChange={setTurnpoints}
                  onOpenWaypointLibrary={() => setShowWaypointPanel(true)}
                />
              </div>

              {/* Start Gates Section */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 border-b pb-2">
                  Start Gates & Deadline
                </h4>
                {(errors.startGates || errors.deadline) && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {errors.startGates || errors.deadline}
                  </div>
                )}
                <StartGateEditor
                  startGates={startGates}
                  deadline={deadline}
                  taskDate={date}
                  onChange={handleStartGatesChange}
                />
              </div>

              {/* Advanced Settings (collapsible) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 font-medium text-gray-700 border-b pb-2 w-full text-left"
                >
                  <span>{showAdvanced ? "▼" : "▶"}</span>
                  <span>Advanced Settings</span>
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        QNH Setting (hPa)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={qnhSetting}
                        onChange={(e) =>
                          setQnhSetting(parseFloat(e.target.value) || 1013.25)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Leading Time Ratio
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={leadingTimeRatio}
                        onChange={(e) =>
                          setLeadingTimeRatio(
                            parseFloat(e.target.value) || 0.26
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Task State
                      </label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value as TaskState)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Stopped">Stopped</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Waypoint Library Panel */}
      <WaypointLibraryPanel
        isOpen={showWaypointPanel}
        onClose={() => setShowWaypointPanel(false)}
        onAddWaypoint={handleAddWaypoint}
      />
    </>
  );
};

export default TaskEditorDialog;
