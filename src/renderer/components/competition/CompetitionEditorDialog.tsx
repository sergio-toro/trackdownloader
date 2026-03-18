/**
 * CompetitionEditorDialog - Modal dialog for editing competition details
 */

import React, { useState, useEffect } from "react";
import type { Competition } from "@main/scoring/types";
import { toSlug } from "@main/scoring/utils/slug";

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
  const [compId, setCompId] = useState(competition.id);
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [idError, setIdError] = useState("");
  const [location, setLocation] = useState(competition.location);
  const [startDate, setStartDate] = useState(competition.startDate);
  const [endDate, setEndDate] = useState(competition.endDate);
  const [timeZone, setTimeZone] = useState(competition.timeZone);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(competition.name);
      setCompId(competition.id);
      setIdManuallyEdited(false);
      setIdError("");
      setLocation(competition.location);
      setStartDate(competition.startDate);
      setEndDate(competition.endDate);
      setTimeZone(competition.timeZone);
    }
  }, [isOpen, competition]);

  if (!isOpen) return null;

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!idManuallyEdited) {
      setCompId(toSlug(newName));
      setIdError("");
    }
  };

  const handleIdChange = (id: string) => {
    const sanitized = id.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setCompId(sanitized);
    setIdManuallyEdited(true);
    setIdError("");
  };

  const validateId = async () => {
    if (!compId || compId === competition.id) return;
    try {
      const existingIds = await window.scoring.listCompetitionIds();
      if (existingIds.includes(compId)) {
        setIdError("This ID is already taken");
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (idError) return;
    setSaving(true);
    try {
      const updates: Partial<Competition> = {
        name,
        location,
        startDate,
        endDate,
        timeZone,
      };
      if (compId !== competition.id) {
        updates.id = compId;
      }
      await onSave(updates);
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
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID
            </label>
            <input
              type="text"
              value={compId}
              onChange={(e) => handleIdChange(e.target.value)}
              onBlur={validateId}
              className={`w-full border rounded px-3 py-1.5 text-sm font-mono ${
                idError ? "border-red-400" : "border-gray-300"
              }`}
            />
            {idError && <p className="text-red-500 text-xs mt-1">{idError}</p>}
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
            disabled={saving || !name.trim() || !compId || !!idError}
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
