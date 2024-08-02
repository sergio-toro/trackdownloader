import React, { useEffect, useState } from "react";
// eslint-disable-next-line import/no-named-as-default
import ReactDataSheet from "react-datasheet";
import ContextMenu from "@components/layout/ContextMenu";
import { useDebounce } from "@uidotdev/usehooks";
import Card from "@components/layout/Card";

import "./PilotsForm.css";
import { useSettings } from "@renderer/context/settingsContext";

export interface GridElement extends ReactDataSheet.Cell<GridElement, number> {
  value: string | null;
  readonly?: boolean;
}

class DataSheet extends ReactDataSheet<GridElement, number> {}

interface ContextMenu {
  isOpen: boolean;
  x: number;
  y: number;
}

interface CellContextMenu extends ContextMenu {
  cell: GridElement | null;
  col: number | null;
  row: number | null;
}

interface RowsRangeContextMenu extends ContextMenu {
  start: number | null;
  end: number | null;
}

export default function PilotsForm() {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [rowsRangeContextMenu, setRowsRangeContextMenu] =
    useState<RowsRangeContextMenu | null>({
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
  const {
    settings: { pilots },
    setPilots,
  } = useSettings();

  const [data, setData] = useState<GridElement[][]>([
    [
      { value: "ID", readOnly: true, className: "cell read-only w-[50px]" },
      { value: "Name", readOnly: true },

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
      {
        value: "League",
        readOnly: true,
        className: "cell read-only w-[125px]",
      },
    ],
    ...(pilots?.length > 0
      ? pilots
      : [
          {
            id: null,
            name: null,
            xcontest: null,
            volandoo: null,
            league: null,
          },
        ]
    ).map((pilot) => [
      { value: pilot.id ? String(pilot.id) : undefined },
      { value: pilot.name },
      { value: pilot.xcontest },
      { value: pilot.volandoo },
      { value: pilot.league },
    ]),
  ]);
  const debouncedData = useDebounce(data, 250);

  useEffect(() => {
    document.addEventListener("mousemove", (e) => {
      setCursorPosition({ x: e.pageX, y: e.pageY });
    });
    return () => {
      document.removeEventListener("mousemove", () => {});
    };
  }, []);

  useEffect(() => {
    const pilotsData = debouncedData
      .slice(1)
      .filter((row) => row[0].value)
      .map((row) => ({
        id: Number(row[0].value),
        name: row[1].value,
        xcontest: row[2].value,
        volandoo: row[3].value,
        league: row[4].value,
      }));

    setPilots(pilotsData);
  }, [debouncedData]);

  return (
    <Card title="Pilots" className="PilotsForm bg-bgCard">
      <div className="max-h-[23rem] overflow-y-auto border border-gray-300 rounded-lg">
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
                [{ value: "" }, { value: "" }, { value: "" }, { value: "" }],
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
                [{ value: "" }, { value: "" }, { value: "" }, { value: "" }],
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
    </Card>
  );
}
