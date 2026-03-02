/**
 * StartGateEditor - Editor for start gates and deadline
 */

import React, { useCallback } from "react";
import type { StartGate } from "@main/scoring/types";

interface StartGateEditorProps {
  startGates: StartGate[];
  deadline: string; // ISO datetime
  taskDate: string; // ISO date for defaults
  onChange: (startGates: StartGate[], deadline: string) => void;
}

const StartGateEditor: React.FC<StartGateEditorProps> = ({
  startGates,
  deadline,
  taskDate,
  onChange,
}) => {
  const handleAddGate = useCallback(() => {
    // Default new gate to task date at 10:30
    const defaultTime = new Date(`${taskDate}T10:30:00`);
    const newGate: StartGate = {
      open: defaultTime.toISOString(),
    };
    onChange([...startGates, newGate], deadline);
  }, [startGates, deadline, taskDate, onChange]);

  const handleRemoveGate = useCallback(
    (index: number) => {
      const newGates = startGates.filter((_, i) => i !== index);
      onChange(newGates, deadline);
    },
    [startGates, deadline, onChange]
  );

  const handleGateChange = useCallback(
    (index: number, time: string) => {
      const newGates = [...startGates];
      newGates[index] = {
        ...newGates[index],
        open: new Date(time).toISOString(),
      };
      // Sort gates by time
      newGates.sort(
        (a, b) => new Date(a.open).getTime() - new Date(b.open).getTime()
      );
      onChange(newGates, deadline);
    },
    [startGates, deadline, onChange]
  );

  const handleDeadlineChange = useCallback(
    (time: string) => {
      onChange(startGates, new Date(time).toISOString());
    },
    [startGates, onChange]
  );

  // Helper to format datetime for input
  const formatDatetimeLocal = (iso: string): string => {
    try {
      return iso.slice(0, 16);
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Start Gates */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Start Gates
          </label>
          <button
            type="button"
            onClick={handleAddGate}
            className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            + Add Gate
          </button>
        </div>

        {startGates.length === 0 ? (
          <div className="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
            <p className="text-sm text-gray-500">No start gates defined</p>
            <button
              type="button"
              onClick={handleAddGate}
              className="mt-2 px-3 py-1.5 text-sm text-blue-600 hover:underline"
            >
              Add a start gate
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {startGates.map((gate, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-16">
                  Gate {index + 1}:
                </span>
                <input
                  type="datetime-local"
                  value={formatDatetimeLocal(gate.open)}
                  onChange={(e) => handleGateChange(index, e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveGate(index)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  title="Remove gate"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deadline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Task Deadline
        </label>
        <input
          type="datetime-local"
          value={formatDatetimeLocal(deadline)}
          onChange={(e) => handleDeadlineChange(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          The time after which pilots cannot make goal
        </p>
      </div>
    </div>
  );
};

export default StartGateEditor;
