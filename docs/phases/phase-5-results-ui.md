# Phase 5: Results & UI

This phase implements the user interface for competition management and results display.

## Goals

1. Create Competition route and navigation
2. Implement participant management
3. Build task results display
4. Create competition standings with FTV
5. Add export functionality

## Dependencies

- Phase 1 (Types, Storage, Context)
- Phase 4 (Scoring Engine)

## Files to Create

```
src/renderer/
├── routes/
│   └── Competition.tsx            # Main competition route
├── components/
│   ├── competition/
│   │   ├── CompetitionHeader.tsx  # Title, date, settings
│   │   ├── CompetitionSettings.tsx
│   │   ├── ScoringFormulaForm.tsx
│   │   └── TaskList.tsx           # List of tasks
│   ├── participants/
│   │   ├── ParticipantTable.tsx   # Editable participant grid
│   │   ├── ParticipantTrackLinker.tsx
│   │   └── ImportParticipantsDialog.tsx
│   ├── task/
│   │   ├── TaskHeader.tsx
│   │   ├── TaskMap.tsx            # Turnpoint visualization
│   │   └── ScoreTaskButton.tsx
│   ├── results/
│   │   ├── TaskResultsTable.tsx   # Scored results table
│   │   ├── PointsBreakdown.tsx    # Point category chart
│   │   ├── PilotFlightCard.tsx    # Individual pilot details
│   │   └── CompetitionStandings.tsx
│   └── export/
│       └── ExportDialog.tsx
```

---

## Competition Route

```typescript
// src/renderer/routes/Competition.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompetition } from '../context/competitionContext';
import CompetitionHeader from '../components/competition/CompetitionHeader';
import TaskList from '../components/competition/TaskList';
import ParticipantTable from '../components/participants/ParticipantTable';
import CompetitionStandings from '../components/results/CompetitionStandings';
import ExportDialog from '../components/export/ExportDialog';

type TabType = 'tasks' | 'participants' | 'standings' | 'settings';

const Competition: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const { competition, loadCompetition, isLoading, error } = useCompetition();
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (competitionId) {
      loadCompetition(competitionId);
    }
  }, [competitionId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        Error loading competition: {error}
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="p-4">
        Competition not found.
        <button onClick={() => navigate('/')} className="ml-2 text-blue-500">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <CompetitionHeader
        competition={competition}
        onExport={() => setShowExport(true)}
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 px-4">
          {(['tasks', 'participants', 'standings', 'settings'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-3 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'tasks' && (
          <TaskList
            tasks={competition.tasks}
            onSelectTask={(taskId) => navigate(`/competition/${competitionId}/task/${taskId}`)}
          />
        )}
        {activeTab === 'participants' && (
          <ParticipantTable competitionId={competitionId!} />
        )}
        {activeTab === 'standings' && (
          <CompetitionStandings competitionId={competitionId!} />
        )}
        {activeTab === 'settings' && (
          <CompetitionSettings competitionId={competitionId!} />
        )}
      </div>

      {showExport && (
        <ExportDialog
          competitionId={competitionId!}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
};

export default Competition;
```

---

## Competition Header

```typescript
// src/renderer/components/competition/CompetitionHeader.tsx

import React from 'react';
import type { Competition } from '../../../main/scoring/types';

interface Props {
  competition: Competition;
  onExport: () => void;
}

const CompetitionHeader: React.FC<Props> = ({ competition, onExport }) => {
  const totalTasks = competition.tasks.length;
  const scoredTasks = competition.tasks.filter(t => t.scoredAt).length;

  return (
    <div className="bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {competition.name}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span>{competition.location}</span>
            <span>
              {new Date(competition.startDate).toLocaleDateString()} -{' '}
              {new Date(competition.endDate).toLocaleDateString()}
            </span>
            <span>{competition.participants.length} pilots</span>
            <span>
              {scoredTasks}/{totalTasks} tasks scored
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            {competition.formula.name}
          </span>
          <button
            onClick={onExport}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetitionHeader;
```

---

## Task List

```typescript
// src/renderer/components/competition/TaskList.tsx

import React, { useState } from 'react';
import type { TaskDefinition } from '../../../main/scoring/types';
import ImportXctskDialog from '../task/ImportXctskDialog';

interface Props {
  tasks: TaskDefinition[];
  onSelectTask: (taskId: string) => void;
}

const TaskList: React.FC<Props> = ({ tasks, onSelectTask }) => {
  const [showImport, setShowImport] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button
          onClick={() => setShowImport(true)}
          className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Import Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tasks yet. Import an XCTrack task file to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              taskNumber={index + 1}
              onClick={() => onSelectTask(task.id)}
            />
          ))}
        </div>
      )}

      {showImport && (
        <ImportXctskDialog
          isOpen={showImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
};

interface TaskCardProps {
  task: TaskDefinition;
  taskNumber: number;
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, taskNumber, onClick }) => {
  const statusColor = task.scoredAt
    ? 'bg-green-100 text-green-800'
    : 'bg-yellow-100 text-yellow-800';

  const statusText = task.scoredAt ? 'Scored' : 'Not Scored';

  return (
    <div
      onClick={onClick}
      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Task {taskNumber}</span>
            <span className="text-gray-500">- {task.name}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            <span>{task.date}</span>
            <span className="mx-2">|</span>
            <span>{(task.taskDistance / 1000).toFixed(1)} km</span>
            <span className="mx-2">|</span>
            <span>{task.turnpoints.length} turnpoints</span>
            <span className="mx-2">|</span>
            <span>{task.taskType}</span>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs rounded ${statusColor}`}>
          {statusText}
        </span>
      </div>
    </div>
  );
};

export default TaskList;
```

---

## Participant Table

```typescript
// src/renderer/components/participants/ParticipantTable.tsx

import React, { useState, useMemo } from 'react';
import { useCompetition } from '../../context/competitionContext';
import type { Participant } from '../../../main/scoring/types';
import ParticipantTrackLinker from './ParticipantTrackLinker';
import ImportParticipantsDialog from './ImportParticipantsDialog';

interface Props {
  competitionId: string;
}

const ParticipantTable: React.FC<Props> = ({ competitionId }) => {
  const { competition, updateParticipant, addParticipant, removeParticipant } = useCompetition();
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  const participants = competition?.participants || [];

  const filteredParticipants = useMemo(() => {
    if (!search) return participants;
    const lower = search.toLowerCase();
    return participants.filter(
      p =>
        p.name.toLowerCase().includes(lower) ||
        p.civlId?.toString().includes(lower) ||
        p.glider?.toLowerCase().includes(lower)
    );
  }, [participants, search]);

  const handleAddNew = () => {
    const newParticipant: Participant = {
      id: Date.now(),
      name: 'New Pilot',
      nation: '',
      glider: '',
      status: 'Confirmed',
    };
    addParticipant(newParticipant);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            Participants ({participants.length})
          </h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border rounded text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Import CSV
          </button>
          <button
            onClick={handleAddNew}
            className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Add Pilot
          </button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Nation</th>
              <th className="px-4 py-2 text-left">Glider</th>
              <th className="px-4 py-2 text-left">CIVL ID</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Tracks</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((participant, index) => (
              <ParticipantRow
                key={participant.id}
                participant={participant}
                index={index + 1}
                onUpdate={updateParticipant}
                onRemove={removeParticipant}
                onLinkTracks={() => setSelectedParticipant(participant)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {showImport && (
        <ImportParticipantsDialog
          isOpen={showImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {selectedParticipant && (
        <ParticipantTrackLinker
          participant={selectedParticipant}
          competitionId={competitionId}
          onClose={() => setSelectedParticipant(null)}
        />
      )}
    </div>
  );
};

interface RowProps {
  participant: Participant;
  index: number;
  onUpdate: (participant: Participant) => void;
  onRemove: (id: number) => void;
  onLinkTracks: () => void;
}

const ParticipantRow: React.FC<RowProps> = ({
  participant,
  index,
  onUpdate,
  onRemove,
  onLinkTracks,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(participant);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(participant);
    setIsEditing(false);
  };

  const trackCount = participant.taskTracks?.length || 0;

  if (isEditing) {
    return (
      <tr className="border-t bg-yellow-50">
        <td className="px-4 py-2">{index}</td>
        <td className="px-4 py-2">
          <input
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="w-full px-2 py-1 border rounded"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={editData.nation || ''}
            onChange={(e) => setEditData({ ...editData, nation: e.target.value })}
            className="w-20 px-2 py-1 border rounded"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={editData.glider || ''}
            onChange={(e) => setEditData({ ...editData, glider: e.target.value })}
            className="w-full px-2 py-1 border rounded"
          />
        </td>
        <td className="px-4 py-2">
          <input
            value={editData.civlId || ''}
            onChange={(e) => setEditData({ ...editData, civlId: parseInt(e.target.value) || undefined })}
            className="w-24 px-2 py-1 border rounded"
          />
        </td>
        <td className="px-4 py-2">
          <select
            value={editData.status}
            onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
            className="px-2 py-1 border rounded"
          >
            <option value="Confirmed">Confirmed</option>
            <option value="Waiting">Waiting</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </td>
        <td className="px-4 py-2">{trackCount}</td>
        <td className="px-4 py-2 text-right">
          <button onClick={handleSave} className="text-green-600 mr-2">Save</button>
          <button onClick={handleCancel} className="text-gray-500">Cancel</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="px-4 py-2">{index}</td>
      <td className="px-4 py-2 font-medium">{participant.name}</td>
      <td className="px-4 py-2">{participant.nation || '-'}</td>
      <td className="px-4 py-2">{participant.glider || '-'}</td>
      <td className="px-4 py-2">{participant.civlId || '-'}</td>
      <td className="px-4 py-2">
        <span className={`px-2 py-0.5 text-xs rounded ${
          participant.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
          participant.status === 'Waiting' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {participant.status}
        </span>
      </td>
      <td className="px-4 py-2">
        <button onClick={onLinkTracks} className="text-blue-500 hover:underline">
          {trackCount} tracks
        </button>
      </td>
      <td className="px-4 py-2 text-right">
        <button onClick={() => setIsEditing(true)} className="text-blue-500 mr-2">Edit</button>
        <button onClick={() => onRemove(participant.id)} className="text-red-500">Remove</button>
      </td>
    </tr>
  );
};

export default ParticipantTable;
```

---

## Task Results Table

```typescript
// src/renderer/components/results/TaskResultsTable.tsx

import React, { useState, useMemo } from 'react';
import type { TaskResult, PilotResult } from '../../../main/scoring/types';

interface Props {
  result: TaskResult;
  onSelectPilot?: (pilotId: number) => void;
}

type SortKey = 'rank' | 'name' | 'distance' | 'time' | 'total';
type SortDir = 'asc' | 'desc';

const TaskResultsTable: React.FC<Props> = ({ result, onSelectPilot }) => {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<'all' | 'goal' | 'landed'>('all');

  const sortedResults = useMemo(() => {
    let filtered = [...result.pilotResults];

    // Apply filter
    if (filter === 'goal') {
      filtered = filtered.filter(r => r.reachedGoal);
    } else if (filter === 'landed') {
      filtered = filtered.filter(r => !r.reachedGoal);
    }

    // Apply sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'rank':
          cmp = a.rank - b.rank;
          break;
        case 'distance':
          cmp = a.distance - b.distance;
          break;
        case 'time':
          cmp = (a.time || Infinity) - (b.time || Infinity);
          break;
        case 'total':
          cmp = a.totalPoints - b.totalPoints;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [result.pilotResults, sortKey, sortDir, filter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'desc');
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Task Summary */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-100 rounded p-3">
          <div className="text-sm text-gray-500">Day Quality</div>
          <div className="text-xl font-bold">
            {(result.dayQuality * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-100 rounded p-3">
          <div className="text-sm text-gray-500">In Goal</div>
          <div className="text-xl font-bold">
            {result.statistics.pilotsInGoal} / {result.statistics.pilotsFlying}
          </div>
        </div>
        <div className="bg-gray-100 rounded p-3">
          <div className="text-sm text-gray-500">Best Time</div>
          <div className="text-xl font-bold">
            {formatTime(result.statistics.bestTime)}
          </div>
        </div>
        <div className="bg-gray-100 rounded p-3">
          <div className="text-sm text-gray-500">Max Points</div>
          <div className="text-xl font-bold">
            {result.availablePoints.totalAvailable.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'goal', 'landed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${
              filter === f ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            {f === 'all' ? 'All Pilots' : f === 'goal' ? 'In Goal' : 'Landed Out'}
          </button>
        ))}
      </div>

      {/* Results table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader column="rank" current={sortKey} dir={sortDir} onClick={handleSort}>
                #
              </SortHeader>
              <th className="px-4 py-2 text-left">Pilot</th>
              <SortHeader column="distance" current={sortKey} dir={sortDir} onClick={handleSort}>
                Distance
              </SortHeader>
              <SortHeader column="time" current={sortKey} dir={sortDir} onClick={handleSort}>
                Time
              </SortHeader>
              <th className="px-4 py-2 text-right">Dist Pts</th>
              <th className="px-4 py-2 text-right">Time Pts</th>
              <th className="px-4 py-2 text-right">Lead Pts</th>
              <th className="px-4 py-2 text-right">Penalty</th>
              <SortHeader column="total" current={sortKey} dir={sortDir} onClick={handleSort}>
                Total
              </SortHeader>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map(pilot => (
              <tr
                key={pilot.pilotId}
                onClick={() => onSelectPilot?.(pilot.pilotId)}
                className={`border-t hover:bg-gray-50 cursor-pointer ${
                  pilot.reachedGoal ? 'bg-green-50' : ''
                }`}
              >
                <td className="px-4 py-2 font-medium">{pilot.rank}</td>
                <td className="px-4 py-2">
                  Pilot {pilot.pilotId}
                  {pilot.reachedGoal && (
                    <span className="ml-2 text-green-600 text-xs">GOAL</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {(pilot.distance / 1000).toFixed(2)} km
                </td>
                <td className="px-4 py-2 text-right">
                  {formatTime(pilot.time)}
                </td>
                <td className="px-4 py-2 text-right">
                  {pilot.distancePoints.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right">
                  {pilot.timePoints.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right">
                  {pilot.leadingPoints.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right text-red-600">
                  {pilot.penaltyPoints > 0 ? `-${pilot.penaltyPoints.toFixed(1)}` : '-'}
                </td>
                <td className="px-4 py-2 text-right font-bold">
                  {pilot.totalPoints.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface SortHeaderProps {
  column: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  children: React.ReactNode;
}

const SortHeader: React.FC<SortHeaderProps> = ({ column, current, dir, onClick, children }) => (
  <th
    onClick={() => onClick(column)}
    className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100"
  >
    {children}
    {current === column && (
      <span className="ml-1">{dir === 'asc' ? '▲' : '▼'}</span>
    )}
  </th>
);

export default TaskResultsTable;
```

---

## Competition Standings

```typescript
// src/renderer/components/results/CompetitionStandings.tsx

import React, { useEffect, useState } from 'react';
import { useCompetition } from '../../context/competitionContext';
import type { CompetitionResult } from '../../../main/scoring/types';

interface Props {
  competitionId: string;
}

const CompetitionStandings: React.FC<Props> = ({ competitionId }) => {
  const { competition, getCompetitionResults } = useCompetition();
  const [results, setResults] = useState<CompetitionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, [competitionId]);

  const loadResults = async () => {
    setIsLoading(true);
    try {
      const data = await getCompetitionResults(competitionId);
      setResults(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading standings...</div>;
  }

  if (!results || results.standings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No scored tasks yet. Score tasks to see competition standings.
      </div>
    );
  }

  const tasks = competition?.tasks || [];
  const ftvPercent = (competition?.formula.ftvFactor || 1) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Competition Standings</h2>
        <div className="text-sm text-gray-500">
          FTV: {ftvPercent}% | Tasks: {results.taskCount} | Scored: {results.scoredTaskCount}
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left sticky left-0 bg-gray-50">#</th>
              <th className="px-4 py-2 text-left sticky left-10 bg-gray-50">Pilot</th>
              <th className="px-4 py-2 text-left">Nation</th>
              <th className="px-4 py-2 text-left">Glider</th>
              {tasks.map((task, i) => (
                <th key={task.id} className="px-4 py-2 text-right whitespace-nowrap">
                  T{i + 1}
                </th>
              ))}
              <th className="px-4 py-2 text-right font-bold bg-blue-50">Total</th>
            </tr>
          </thead>
          <tbody>
            {results.standings.map((standing, index) => {
              const participant = competition?.participants.find(p => p.id === standing.participantId);

              return (
                <tr key={standing.participantId} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium sticky left-0 bg-white">
                    {standing.rank}
                  </td>
                  <td className="px-4 py-2 sticky left-10 bg-white">
                    {participant?.name || `Pilot ${standing.participantId}`}
                  </td>
                  <td className="px-4 py-2">{participant?.nation || '-'}</td>
                  <td className="px-4 py-2">{participant?.glider || '-'}</td>
                  {tasks.map(task => {
                    const taskPoints = standing.taskPoints[task.id];
                    const isDiscarded = standing.discardedTasks?.includes(task.id);

                    return (
                      <td
                        key={task.id}
                        className={`px-4 py-2 text-right ${
                          isDiscarded ? 'text-gray-400 line-through' : ''
                        }`}
                      >
                        {taskPoints !== undefined ? taskPoints.toFixed(0) : '-'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right font-bold bg-blue-50">
                    {standing.totalPoints.toFixed(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompetitionStandings;
```

---

## FTV Calculation

```typescript
// src/main/scoring/scoring/ftvCalculator.ts

import type { TaskResult, CompetitionStanding, Competition } from '../types';

export interface FtvOptions {
  taskResults: TaskResult[];
  ftvFactor: number;  // 0-1, e.g., 0.25 means discard 25%
}

export function calculateCompetitionStandings(
  competition: Competition,
  taskResults: TaskResult[]
): CompetitionStanding[] {
  const { participants, formula } = competition;
  const ftvFactor = formula.ftvFactor || 0;

  const standings: CompetitionStanding[] = [];

  for (const participant of participants) {
    const pilotResults: { taskId: string; points: number; maxPoints: number }[] = [];

    // Collect pilot results from each task
    for (const taskResult of taskResults) {
      const pilotResult = taskResult.pilotResults.find(
        r => r.pilotId === participant.id
      );

      if (pilotResult) {
        pilotResults.push({
          taskId: taskResult.taskId,
          points: pilotResult.totalPoints,
          maxPoints: taskResult.availablePoints.totalAvailable,
        });
      }
    }

    // Calculate FTV
    const { totalPoints, discardedTasks, taskPoints } = applyFtv(
      pilotResults,
      ftvFactor
    );

    standings.push({
      participantId: participant.id,
      rank: 0, // Set after sorting
      totalPoints,
      taskPoints,
      discardedTasks,
      tasksFlown: pilotResults.length,
    });
  }

  // Sort by total points descending
  standings.sort((a, b) => b.totalPoints - a.totalPoints);

  // Assign ranks (handle ties)
  let rank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0 && standings[i].totalPoints < standings[i - 1].totalPoints) {
      rank = i + 1;
    }
    standings[i].rank = rank;
  }

  return standings;
}

interface FtvResult {
  totalPoints: number;
  discardedTasks: string[];
  taskPoints: Record<string, number>;
}

function applyFtv(
  results: { taskId: string; points: number; maxPoints: number }[],
  ftvFactor: number
): FtvResult {
  if (results.length === 0) {
    return { totalPoints: 0, discardedTasks: [], taskPoints: {} };
  }

  const taskPoints: Record<string, number> = {};
  for (const r of results) {
    taskPoints[r.taskId] = r.points;
  }

  if (ftvFactor <= 0 || results.length <= 1) {
    // No FTV - sum all points
    const total = results.reduce((sum, r) => sum + r.points, 0);
    return { totalPoints: total, discardedTasks: [], taskPoints };
  }

  // Calculate total available points
  const totalMaxPoints = results.reduce((sum, r) => sum + r.maxPoints, 0);

  // Target points = (1 - ftvFactor) * totalMax
  const targetPoints = totalMaxPoints * (1 - ftvFactor);

  // Sort tasks by normalized score (points / maxPoints) descending
  const sorted = [...results].sort((a, b) => {
    const scoreA = a.maxPoints > 0 ? a.points / a.maxPoints : 0;
    const scoreB = b.maxPoints > 0 ? b.points / b.maxPoints : 0;
    return scoreB - scoreA;
  });

  // Accumulate until we reach target
  let accumulated = 0;
  let accumulatedMax = 0;
  const countingTasks: string[] = [];
  const discardedTasks: string[] = [];

  for (const result of sorted) {
    if (accumulatedMax >= targetPoints) {
      // This task is discarded
      discardedTasks.push(result.taskId);
    } else {
      // This task counts
      const remaining = targetPoints - accumulatedMax;
      const contribution = Math.min(result.maxPoints, remaining);
      const pointFraction = result.maxPoints > 0 ? contribution / result.maxPoints : 0;

      accumulated += result.points * pointFraction;
      accumulatedMax += contribution;
      countingTasks.push(result.taskId);
    }
  }

  return {
    totalPoints: accumulated,
    discardedTasks,
    taskPoints,
  };
}
```

---

## Export Dialog

```typescript
// src/renderer/components/export/ExportDialog.tsx

import React, { useState } from 'react';
import { useCompetition } from '../../context/competitionContext';

interface Props {
  competitionId: string;
  onClose: () => void;
}

type ExportFormat = 'csv' | 'html' | 'fsdb' | 'json';

const ExportDialog: React.FC<Props> = ({ competitionId, onClose }) => {
  const { exportResults } = useCompetition();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeTaskResults, setIncludeTaskResults] = useState(true);
  const [includeStandings, setIncludeStandings] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportResults(competitionId, {
        format,
        includeTaskResults,
        includeStandings,
      });
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[400px] shadow-xl">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Export Results</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <div className="grid grid-cols-4 gap-2">
              {(['csv', 'html', 'fsdb', 'json'] as ExportFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-2 border rounded text-sm ${
                    format === f
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeTaskResults}
                onChange={e => setIncludeTaskResults(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Include task results</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeStandings}
                onChange={e => setIncludeStandings(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Include competition standings</span>
            </label>
          </div>

          {/* Format info */}
          <div className="text-sm text-gray-500 bg-gray-50 rounded p-3">
            {format === 'csv' && 'Standard CSV format, compatible with Excel and spreadsheets.'}
            {format === 'html' && 'HTML tables for web publishing or printing.'}
            {format === 'fsdb' && 'FS Database format for official CIVL results.'}
            {format === 'json' && 'JSON format for programmatic use.'}
          </div>
        </div>

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
```

---

## CSV Export Implementation

```typescript
// src/main/scoring/export/csvExporter.ts

import type { Competition, TaskResult, CompetitionStanding } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface CsvExportOptions {
  outputDir: string;
  includeTaskResults: boolean;
  includeStandings: boolean;
}

export async function exportToCsv(
  competition: Competition,
  taskResults: TaskResult[],
  standings: CompetitionStanding[],
  options: CsvExportOptions
): Promise<string[]> {
  const files: string[] = [];

  // Export standings
  if (options.includeStandings) {
    const standingsPath = path.join(options.outputDir, `${competition.id}_standings.csv`);
    const csv = generateStandingsCsv(competition, standings);
    fs.writeFileSync(standingsPath, csv);
    files.push(standingsPath);
  }

  // Export task results
  if (options.includeTaskResults) {
    for (const result of taskResults) {
      const taskPath = path.join(options.outputDir, `${competition.id}_${result.taskId}.csv`);
      const csv = generateTaskResultsCsv(competition, result);
      fs.writeFileSync(taskPath, csv);
      files.push(taskPath);
    }
  }

  return files;
}

function generateStandingsCsv(
  competition: Competition,
  standings: CompetitionStanding[]
): string {
  const tasks = competition.tasks;
  const headers = [
    'Rank',
    'Pilot',
    'Nation',
    'Glider',
    ...tasks.map((_, i) => `Task${i + 1}`),
    'Total',
  ];

  const rows = standings.map(s => {
    const participant = competition.participants.find(p => p.id === s.participantId);
    return [
      s.rank,
      participant?.name || '',
      participant?.nation || '',
      participant?.glider || '',
      ...tasks.map(t => s.taskPoints[t.id]?.toFixed(0) || ''),
      s.totalPoints.toFixed(0),
    ];
  });

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateTaskResultsCsv(
  competition: Competition,
  result: TaskResult
): string {
  const headers = [
    'Rank',
    'Pilot',
    'Distance (km)',
    'Time',
    'Distance Pts',
    'Time Pts',
    'Leading Pts',
    'Penalty',
    'Total',
  ];

  const rows = result.pilotResults.map(r => {
    const participant = competition.participants.find(p => p.id === r.pilotId);
    return [
      r.rank,
      participant?.name || '',
      (r.distance / 1000).toFixed(2),
      formatTime(r.time),
      r.distancePoints.toFixed(1),
      r.timePoints.toFixed(1),
      r.leadingPoints.toFixed(1),
      r.penaltyPoints > 0 ? r.penaltyPoints.toFixed(1) : '',
      r.totalPoints.toFixed(1),
    ];
  });

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function formatTime(seconds: number | null): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
```

---

## Points Breakdown Chart

```typescript
// src/renderer/components/results/PointsBreakdown.tsx

import React from 'react';
import type { AvailablePoints } from '../../../main/scoring/types';

interface Props {
  available: AvailablePoints;
  pilot?: {
    distancePoints: number;
    timePoints: number;
    leadingPoints: number;
    arrivalPoints: number;
    penaltyPoints: number;
  };
}

const PointsBreakdown: React.FC<Props> = ({ available, pilot }) => {
  const categories = [
    { key: 'distance', label: 'Distance', available: available.distanceAvailable, color: 'bg-blue-500' },
    { key: 'time', label: 'Time', available: available.timeAvailable, color: 'bg-green-500' },
    { key: 'leading', label: 'Leading', available: available.leadingAvailable, color: 'bg-yellow-500' },
    { key: 'arrival', label: 'Arrival', available: available.arrivalAvailable, color: 'bg-purple-500' },
  ];

  const total = available.totalAvailable;

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700">
        Points Distribution ({total.toFixed(0)} available)
      </div>

      {/* Stacked bar */}
      <div className="h-6 rounded-full overflow-hidden flex bg-gray-200">
        {categories.map(cat => {
          const percent = total > 0 ? (cat.available / total) * 100 : 0;
          if (percent < 1) return null;
          return (
            <div
              key={cat.key}
              className={`${cat.color} flex items-center justify-center text-xs text-white`}
              style={{ width: `${percent}%` }}
            >
              {percent >= 10 && `${percent.toFixed(0)}%`}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-2 text-sm">
        {categories.map(cat => (
          <div key={cat.key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${cat.color}`} />
            <span>{cat.label}: {cat.available.toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Pilot points (if provided) */}
      {pilot && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium text-gray-700 mb-2">Pilot Points</div>
          <div className="grid grid-cols-5 gap-2 text-sm">
            <div>
              <div className="text-gray-500">Distance</div>
              <div className="font-medium">{pilot.distancePoints.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-gray-500">Time</div>
              <div className="font-medium">{pilot.timePoints.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-gray-500">Leading</div>
              <div className="font-medium">{pilot.leadingPoints.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-gray-500">Arrival</div>
              <div className="font-medium">{pilot.arrivalPoints.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-gray-500">Penalty</div>
              <div className="font-medium text-red-600">
                {pilot.penaltyPoints > 0 ? `-${pilot.penaltyPoints.toFixed(1)}` : '-'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsBreakdown;
```

---

## Navigation Updates

```typescript
// src/renderer/App.tsx (additions)

import { Routes, Route } from 'react-router-dom';
import Competition from './routes/Competition';
import TaskDetails from './routes/TaskDetails';

// Add routes in App component:
<Routes>
  {/* Existing routes */}
  <Route path="/competition/:competitionId" element={<Competition />} />
  <Route path="/competition/:competitionId/task/:taskId" element={<TaskDetails />} />
</Routes>
```

---

## Validation Checklist

- [ ] Competition route loads and displays data
- [ ] Task list shows all tasks with correct status
- [ ] Participant table is editable
- [ ] Track linking works correctly
- [ ] Task results table sorts correctly
- [ ] Competition standings calculate FTV correctly
- [ ] Export produces valid files
- [ ] Navigation works between all views

## Implementation Complete

With this phase complete, the competition classification system is fully functional:

1. **Phase 1**: Types, storage, IPC infrastructure
2. **Phase 2**: XCTrack task import with distance calculation
3. **Phase 3**: IGC flight analysis with turnpoint detection
4. **Phase 4**: GAP2023/GAP2025 scoring engine
5. **Phase 5**: Full UI with results and export
