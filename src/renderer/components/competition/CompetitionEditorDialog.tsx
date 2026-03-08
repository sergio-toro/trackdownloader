/**
 * CompetitionEditorDialog - Modal dialog for editing competition details
 */

import React, { useState, useEffect } from "react";
import type { Competition } from "@main/scoring/types";

interface CompetitionEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  competition: Competition;
  onSave: (updates: Partial<Competition>) => Promise<void>;
}

const CompetitionEditorDialog: React.FC<CompetitionEditorDialogProps> = ({
  isOpen,
  onClose,
  competition,
  onSave,
}) => {
  const [name, setName] = useState(competition.name);
  const [location, setLocation] = useState(competition.location);
  const [startDate, setStartDate] = useState(competition.startDate);
  const [endDate, setEndDate] = useState(competition.endDate);
  const [timeZone, setTimeZone] = useState(competition.timeZone);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(competition.name);
      setLocation(competition.location);
      setStartDate(competition.startDate);
      setEndDate(competition.endDate);
      setTimeZone(competition.timeZone);
    }
  }, [isOpen, competition]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, location, startDate, endDate, timeZone });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Edit Competition
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Zone
            </label>
            <input
              type="text"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              placeholder="e.g. Europe/Madrid"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetitionEditorDialog;
