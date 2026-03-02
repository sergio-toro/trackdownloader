/**
 * Import XCTrack task dialog
 * Allows users to import .xctsk files as competition tasks
 */

import React, { useState, useCallback } from "react";
import cx from "classnames";
import type { TaskDefinition } from "@main/scoring/types";
import WaypointTable from "./WaypointTable";
import TaskSummary from "./TaskSummary";

interface ImportXctskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (task: TaskDefinition) => Promise<void>;
}

interface TaskPreview {
  valid: boolean;
  name: string;
  turnpointCount: number;
  taskType: string;
  earthModel: string;
  startGates: string[];
  deadline: string;
  errors: string[];
}

type ImportStep = "select" | "preview" | "importing";

const ImportXctskDialog: React.FC<ImportXctskDialogProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [step, setStep] = useState<ImportStep>("select");
  const [filePath, setFilePath] = useState<string | null>(null);
  // Preview is stored but validation uses previewResult directly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_preview, setPreview] = useState<TaskPreview | null>(null);
  const [parsedTask, setParsedTask] = useState<TaskDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetState = useCallback(() => {
    setStep("select");
    setFilePath(null);
    setPreview(null);
    setParsedTask(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSelectFile = useCallback(async () => {
    try {
      setError(null);
      const path = await window.scoring.selectFile("xctsk");
      if (!path) return;

      setFilePath(path);
      setIsLoading(true);

      // Preview the file
      const previewResult = await window.scoring.previewXctsk(path);
      setPreview(previewResult);

      if (previewResult.valid) {
        // Parse the full task
        const task = await window.scoring.importXctsk(path);
        setParsedTask(task);
        setStep("preview");
      } else {
        setError(previewResult.errors.join(", "));
      }
    } catch (err) {
      setError(`Failed to read file: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsedTask) return;

    try {
      setStep("importing");
      setError(null);
      await onImport(parsedTask);
      handleClose();
    } catch (err) {
      setError(`Import failed: ${err}`);
      setStep("preview");
    }
  }, [parsedTask, onImport, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Import XCTrack Task</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
            {/* Error display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Step: Select file */}
            {step === "select" && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 mb-4">
                  Select an XCTrack task file (.xctsk) to import
                </p>
                <button
                  onClick={handleSelectFile}
                  disabled={isLoading}
                  className={cx(
                    "px-4 py-2 rounded font-medium",
                    isLoading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {isLoading ? "Loading..." : "Select File"}
                </button>
                {filePath && (
                  <p className="mt-4 text-sm text-gray-500">{filePath}</p>
                )}
              </div>
            )}

            {/* Step: Preview */}
            {step === "preview" && parsedTask && (
              <div className="space-y-6">
                {/* Task name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name
                  </label>
                  <p className="text-lg font-semibold">{parsedTask.name}</p>
                </div>

                {/* Task summary */}
                <div className="border rounded p-4">
                  <TaskSummary task={parsedTask} />
                </div>

                {/* Waypoints */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Turnpoints
                  </h4>
                  <div className="border rounded">
                    <WaypointTable
                      turnpoints={parsedTask.turnpoints}
                      ssIndex={parsedTask.ssIndex}
                      esIndex={parsedTask.esIndex}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step: Importing */}
            {step === "importing" && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Importing task...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            {step === "preview" && (
              <button
                onClick={handleImport}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                Import Task
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportXctskDialog;
