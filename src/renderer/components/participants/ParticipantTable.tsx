/**
 * Participant table component
 *
 * Editable datasheet table for managing competition participants
 */

import React, { useEffect, useState } from "react";
// eslint-disable-next-line import/no-named-as-default
import ReactDataSheet from "react-datasheet";
import ContextMenu from "@components/layout/ContextMenu";
import { useDebounce } from "@uidotdev/usehooks";
import { useCompetition } from "@renderer/context/competitionContext";
import type { Participant } from "@main/scoring/types";

import "../PilotsForm.css";

export interface GridElement extends ReactDataSheet.Cell<GridElement, number> {
  value: string | null;
  readonly?: boolean;
}

class DataSheet extends ReactDataSheet<GridElement, number> {}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

interface CellContextMenu extends ContextMenuState {
  cell: GridElement | null;
  col: number | null;
  row: number | null;
}

interface RowsRangeContextMenu extends ContextMenuState {
  start: number | null;
  end: number | null;
}

interface ParticipantTableProps {
  competitionId: string;
  participants: Participant[];
}

const ParticipantTable: React.FC<ParticipantTableProps> = ({
  competitionId: _competitionId,
  participants,
}) => {
  const { setParticipants } = useCompetition();

  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [rowsRangeContextMenu, setRowsRangeContextMenu] =
    useState<RowsRangeContextMenu>({
      isOpen: false,
      x: 0,
      y: 0,
      start: 0,
      end: 0,
    });
  const debouncedRowsRangeContextMenu = useDebounce(rowsRangeContextMenu, 500);
  const [cellContextMenu, setCellContextMenu] = useState<CellContextMenu>({
    isOpen: false,
    x: 0,
    y: 0,
    cell: null,
    col: null,
    row: null,
  });

  const [data, setData] = useState<GridElement[][]>([
    [
      { value: "ID", readOnly: true, className: "cell read-only w-[50px]" },
      { value: "Name", readOnly: true },
      {
        value: "Nationality",
        readOnly: true,
        className: "cell read-only w-[80px]",
      },
      { value: "Glider", readOnly: true },
      {
        value: "Glider Class",
        readOnly: true,
        className: "cell read-only w-[80px]",
      },
      {
        value: "Genre",
        readOnly: true,
        className: "cell read-only w-[70px]",
      },
      {
        value: "Club",
        readOnly: true,
        className: "cell read-only w-[100px]",
      },
      {
        value: "XContest",
        readOnly: true,
        className: "cell read-only w-[125px]",
      },
      {
        value: "Volandoo",
        readOnly: true,
        className: "cell read-only w-[125px]",
      },
    ],
    ...(participants?.length > 0
      ? participants
      : [
          {
            id: null,
            name: null,
            nation: null,
            glider: null,
            gliderClass: null,
            genre: null,
            club: null,
            xcontest: null,
            volandoo: null,
          },
        ]
    ).map((participant) => [
      { value: participant.id ? String(participant.id) : undefined },
      { value: participant.name },
      { value: participant.nation },
      { value: participant.glider },
      { value: participant.gliderClass },
      { value: participant.genre },
      { value: participant.club },
      { value: participant.xcontest },
      { value: participant.volandoo },
    ]),
  ]);
  const debouncedData = useDebounce(data, 250);

  // Track cursor position for context menu
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.pageX, y: e.pageY });
    };
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Sync changes from grid to competition context (simple bulk approach)
  useEffect(() => {
    // Parse grid data, assign IDs to new rows, and save all at once
    let nextId =
      participants.length > 0
        ? Math.max(...participants.map((p) => p.id), 0) + 1
        : 1;

    const participantsData = debouncedData
      .slice(1) // Skip header row
      // Filter rows that have ID or Name (required fields)
      .filter((row) => row[0]?.value || row[1]?.value)
      .map((row) => {
        // If no ID but has name, assign a new ID
        const existingId = row[0]?.value ? Number(row[0].value) : 0;
        const id = existingId > 0 ? existingId : nextId++;

        // Find existing participant to preserve status and other fields
        const existing = participants.find((p) => p.id === existingId);

        return {
          id,
          name: row[1]?.value || "",
          nation: row[2]?.value || undefined,
          glider: row[3]?.value || undefined,
          gliderClass: row[4]?.value || undefined,
          genre: row[5]?.value || undefined,
          club: row[6]?.value || undefined,
          xcontest: row[7]?.value || undefined,
          volandoo: row[8]?.value || undefined,
          status: existing?.status || ("Confirmed" as const),
          // Preserve other fields from existing participant
          ...(existing && {
            firstName: existing.firstName,
            lastName: existing.lastName,
            faiId: existing.faiId,
            sponsor: existing.sponsor,
            taskTracks: existing.taskTracks,
          }),
        };
      });

    setParticipants(participantsData);
  }, [debouncedData, setParticipants]);

  return (
    <div className="PilotsForm space-y-4">
      <div className="h-[calc(100vh-16rem)] overflow-y-auto overflow-x-auto border border-gray-300 rounded-lg">
        <DataSheet
          className="w-full"
          data={data}
          valueRenderer={(cell) => cell.value}
          attributesRenderer={(cell) =>
            cell.className ? { className: cell.className } : {}
          }
          onSelect={({ start, end }) => {
            const startRow = end.i < start.i ? end.i : start.i;
            const endRow = start.i > end.i ? start.i : end.i;

            if (startRow === endRow) {
              setRowsRangeContextMenu({
                ...rowsRangeContextMenu,
                isOpen: false,
              });
            } else {
              setRowsRangeContextMenu({
                isOpen: true,
                x: cursorPosition.x,
                y: cursorPosition.y,
                start: startRow,
                end: endRow,
              });
            }
          }}
          onContextMenu={(e, cell, i, j) => {
            e.preventDefault();
            setCellContextMenu({
              isOpen: true,
              x: e.pageX,
              y: e.pageY,
              cell,
              row: i,
              col: j,
            });
          }}
          onCellsChanged={(changes, additions) => {
            const grid = data.map((row) => [...row]);
            changes.forEach(({ row, col, value }) => {
              grid[row][col] = { ...grid[row][col], value: value.toString() };
            });
            if (additions) {
              additions.forEach(({ row, col, value }) => {
                if (!grid[row]) {
                  grid[row] = [];
                }
                grid[row][col] = { value: value.toString() };
              });
            }

            setData(grid);
          }}
        />
      </div>

      <ContextMenu
        isOpen={cellContextMenu.isOpen}
        x={cellContextMenu.x}
        y={cellContextMenu.y}
        options={[
          {
            label: "Add row above",
            handle: () => {
              const grid = [
                ...data.slice(0, cellContextMenu.row),
                [
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                ],
                ...data.slice(cellContextMenu.row),
              ];
              setData(grid);
            },
          },
          {
            label: "Add row below",
            handle: () => {
              const grid = [
                ...data.slice(0, cellContextMenu.row + 1),
                [
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                  { value: "" },
                ],
                ...data.slice(cellContextMenu.row + 1),
              ];
              setData(grid);
            },
          },
          {
            label: "Delete row",
            handle: () => {
              const grid = data.filter((_, i) => i !== cellContextMenu.row);
              setData(grid);
            },
          },
        ]}
        onClose={() =>
          setCellContextMenu({
            ...cellContextMenu,
            isOpen: false,
          })
        }
      />

      <ContextMenu
        isOpen={debouncedRowsRangeContextMenu.isOpen}
        x={rowsRangeContextMenu.x}
        y={rowsRangeContextMenu.y}
        options={[
          {
            label: `Delete rows ${rowsRangeContextMenu.start} - ${rowsRangeContextMenu.end}`,
            handle: () => {
              const grid = [
                ...data.slice(0, rowsRangeContextMenu.start),
                ...data.slice(rowsRangeContextMenu.end + 1),
              ];
              setData(grid);
            },
          },
        ]}
        onClose={() =>
          setRowsRangeContextMenu({
            ...rowsRangeContextMenu,
            isOpen: false,
          })
        }
      />

      {/* Summary */}
      <div className="text-sm text-gray-500">
        {participants.length} participants
      </div>
    </div>
  );
};

export default ParticipantTable;
