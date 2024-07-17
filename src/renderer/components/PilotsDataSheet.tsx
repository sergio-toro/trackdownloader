import React, { useEffect, useState } from "react";
// eslint-disable-next-line import/no-named-as-default
import ReactDataSheet from "react-datasheet";
import ContextMenu from "@components/layout/ContextMenu";
import { useDebounce } from "@uidotdev/usehooks";

export interface GridElement extends ReactDataSheet.Cell<GridElement, number> {
  value: string | number | null;
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

export default function PilotsDataSheet() {
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
  // const rowLabels = ["Item 1", "Item 2"];
  const [data, setData] = useState<GridElement[][]>([
    [
      { value: "ID", readOnly: true },
      { value: "Name", readOnly: true },
      { value: "XCTrack", readOnly: true },
      { value: "Volandoo", readOnly: true },
    ],
    [{ value: "" }, { value: "" }, { value: "" }, { value: "" }],
    [{ value: "" }, { value: "" }, { value: "" }, { value: "" }],
  ]);

  useEffect(() => {
    document.addEventListener("mousemove", (e) => {
      setCursorPosition({ x: e.pageX, y: e.pageY });
    });
    return () => {
      document.removeEventListener("mousemove", () => {});
    };
  }, []);

  return (
    <div className="bg-white">
      <DataSheet
        data={data}
        valueRenderer={(cell) => cell.value}
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
          console.log("SELECT", startRow, endRow);
        }}
        onContextMenu={(e, cell, i, j) => {
          e.preventDefault();
          console.log("CONTEXT MENU", cell, i, j);
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
          changes.forEach(({ /*cell,*/ row, col, value }) => {
            grid[row][col] = { ...grid[row][col], value };
          });
          if (additions) {
            additions.forEach(({ row, col, value }) => {
              if (!grid[row]) {
                grid[row] = [];
              }
              grid[row][col] = { value };
            });
          }

          setData(grid);
          // this.setState({ grid });
        }}
      />

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
    </div>
  );
}
