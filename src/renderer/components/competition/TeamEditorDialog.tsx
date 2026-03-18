import React, { useState, useEffect } from "react";
import type { TeamDefinition } from "@main/scoring/types";

interface TeamEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teams: TeamDefinition[];
  onSave: (teams: TeamDefinition[]) => Promise<void>;
}

const ATTRIBUTE_OPTIONS = [
  { value: "nat_code_ioc", label: "Nation" },
  { value: "club", label: "Club" },
];

function generateId(): string {
  return crypto.randomUUID();
}

function makeEmptyTeamDef(): TeamDefinition {
  return {
    id: generateId(),
    name: "",
    attributeName: "nat_code_ioc",
    numberToCount: 3,
    firstToCount: 1,
  };
}

const TeamEditorDialog: React.FC<TeamEditorDialogProps> = ({
  isOpen,
  onClose,
  teams: initialTeams,
  onSave,
}) => {
  const [teams, setTeams] = useState<TeamDefinition[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTeams(
        initialTeams.length > 0 ? initialTeams.map((t) => ({ ...t })) : []
      );
    }
  }, [isOpen, initialTeams]);

  if (!isOpen) return null;

  const updateTeam = (index: number, updates: Partial<TeamDefinition>) => {
    setTeams((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
    );
  };

  const addTeam = () => {
    setTeams((prev) => [...prev, makeEmptyTeamDef()]);
  };

  const removeTeam = (index: number) => {
    setTeams((prev) => prev.filter((_, i) => i !== index));
  };

  const isCustomAttribute = (attr: string) => attr.startsWith("ca:");

  const handleSave = async () => {
    setSaving(true);
    try {
      const valid = teams.filter((t) => t.name.trim());
      await onSave(valid);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Team Definitions
          </h2>
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
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {teams.map((team, idx) => (
            <div
              key={team.id}
              className="border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => updateTeam(idx, { name: e.target.value })}
                    placeholder="e.g. Nations, Clubs"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <button
                  onClick={() => removeTeam(idx)}
                  className="mt-5 text-red-400 hover:text-red-600"
                  title="Remove team definition"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Group By Attribute
                </label>
                {isCustomAttribute(team.attributeName) ? (
                  <input
                    type="text"
                    value={team.attributeName}
                    onChange={(e) =>
                      updateTeam(idx, { attributeName: e.target.value })
                    }
                    placeholder="ca:team_name"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                ) : (
                  <select
                    value={team.attributeName}
                    onChange={(e) =>
                      updateTeam(idx, { attributeName: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {ATTRIBUTE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="ca:">Custom (ca:...)</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Best N to count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={team.numberToCount}
                    onChange={(e) =>
                      updateTeam(idx, {
                        numberToCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Start from rank
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={team.firstToCount}
                    onChange={(e) =>
                      updateTeam(idx, {
                        firstToCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          {teams.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No team definitions. Add one to enable team scoring.
            </div>
          )}

          <button
            onClick={addTeam}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
          >
            + Add Team Definition
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamEditorDialog;
