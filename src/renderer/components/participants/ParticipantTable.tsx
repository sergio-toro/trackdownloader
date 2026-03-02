/**
 * Participant table component
 *
 * Editable table for managing competition participants
 */

import React, { useState, useCallback } from "react";
import { useCompetition } from "@renderer/context/competitionContext";
import type { Participant, ParticipantStatus } from "@main/scoring/types";

interface ParticipantTableProps {
  competitionId: string;
  participants: Participant[];
}

const ParticipantTable: React.FC<ParticipantTableProps> = ({
  competitionId: _competitionId,
  participants,
}) => {
  const { addParticipant, updateParticipant, deleteParticipant } =
    useCompetition();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Participant>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newParticipant, setNewParticipant] = useState<Partial<Participant>>({
    name: "",
    nation: "",
    glider: "",
    status: "Confirmed",
  });

  const filteredParticipants = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.glider?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartEdit = (participant: Participant) => {
    setEditingId(participant.id);
    setEditData({
      name: participant.name,
      nation: participant.nation || "",
      glider: participant.glider || "",
      civlId: participant.civlId,
      status: participant.status,
    });
  };

  const handleSaveEdit = useCallback(async () => {
    if (editingId === null) return;

    await updateParticipant(editingId, editData);
    setEditingId(null);
    setEditData({});
  }, [editingId, editData, updateParticipant]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleAddParticipant = async () => {
    if (!newParticipant.name?.trim()) return;

    const nextId =
      participants.length > 0
        ? Math.max(...participants.map((p) => p.id)) + 1
        : 1;

    await addParticipant({
      id: nextId,
      name: newParticipant.name.trim(),
      nation: newParticipant.nation || "",
      glider: newParticipant.glider || "",
      civlId: newParticipant.civlId,
      status: (newParticipant.status as ParticipantStatus) || "Confirmed",
    });

    setNewParticipant({
      name: "",
      nation: "",
      glider: "",
      status: "Confirmed",
    });
    setShowAddForm(false);
  };

  const handleRemoveParticipant = async (id: number) => {
    if (window.confirm("Are you sure you want to remove this participant?")) {
      await deleteParticipant(id);
    }
  };

  const statusColors: Record<ParticipantStatus, string> = {
    Confirmed: "bg-green-100 text-green-800",
    Waiting: "bg-yellow-100 text-yellow-800",
    Cancelled: "bg-red-100 text-red-800",
    Withdrawn: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          {showAddForm ? "Cancel" : "Add Participant"}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">New Participant</h3>
          <div className="grid grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Name *"
              value={newParticipant.name || ""}
              onChange={(e) =>
                setNewParticipant((p) => ({ ...p, name: e.target.value }))
              }
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
            <input
              type="text"
              placeholder="Nation"
              value={newParticipant.nation || ""}
              onChange={(e) =>
                setNewParticipant((p) => ({ ...p, nation: e.target.value }))
              }
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
            <input
              type="text"
              placeholder="Glider"
              value={newParticipant.glider || ""}
              onChange={(e) =>
                setNewParticipant((p) => ({ ...p, glider: e.target.value }))
              }
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="CIVL ID"
              value={newParticipant.civlId || ""}
              onChange={(e) =>
                setNewParticipant((p) => ({
                  ...p,
                  civlId: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handleAddParticipant}
              disabled={!newParticipant.name?.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Nation
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Glider
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                CIVL ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Status
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredParticipants.map((participant) => (
              <tr
                key={participant.id}
                className="hover:bg-gray-50 transition-colors"
              >
                {editingId === participant.id ? (
                  <>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {participant.id}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editData.name || ""}
                        onChange={(e) =>
                          setEditData((d) => ({ ...d, name: e.target.value }))
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editData.nation || ""}
                        onChange={(e) =>
                          setEditData((d) => ({ ...d, nation: e.target.value }))
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editData.glider || ""}
                        onChange={(e) =>
                          setEditData((d) => ({ ...d, glider: e.target.value }))
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editData.civlId || ""}
                        onChange={(e) =>
                          setEditData((d) => ({
                            ...d,
                            civlId: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          }))
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editData.status || "Confirmed"}
                        onChange={(e) =>
                          setEditData((d) => ({
                            ...d,
                            status: e.target.value as ParticipantStatus,
                          }))
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Waiting">Waiting</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Withdrawn">Withdrawn</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={handleSaveEdit}
                        className="text-green-600 hover:text-green-800 mr-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {participant.id}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {participant.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {participant.nation || "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {participant.glider || "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {participant.civlId || "-"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[participant.status]}`}
                      >
                        {participant.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleStartEdit(participant)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredParticipants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {participants.length === 0
              ? "No participants yet"
              : "No matching participants"}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500">
        {participants.length} participants
        {searchTerm && ` (${filteredParticipants.length} matching)`}
      </div>
    </div>
  );
};

export default ParticipantTable;
