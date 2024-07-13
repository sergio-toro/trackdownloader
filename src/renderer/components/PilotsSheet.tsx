import React from 'react';
import Spreadsheet from "react-spreadsheet";

type Props = {
  darkMode: boolean
}

export default function PilotsSheet({ darkMode }: Props) {
  const columnLabels = ["ID", "Name", "XCTrack", "Volandoo"];
  // const rowLabels = ["Item 1", "Item 2"];
  const data = [
    [{value: '',},{ value: "Vanilla" }, { value: "Chocolate" }],
    [{value: '',},{ value: "Strawberry" }, { value: "Cookies" }],
    [{value: '',},{ value: "Strawberry2" }, { value: "Cookies2" }],
    [{value: '',},{ value: "Strawberry3" }, { value: "Cookies3" }],
    [{value: '',},{ value: "Strawberry4" }, { value: "Cookies4" }],
    [{value: '',},{ value: "Strawberry5" }, { value: "Cookies5" }],
    [{value: '',},{ value: "" }, { value: "" }],
    [{value: '',},{ value: "" }, { value: "" }],
    [{value: '',},{ value: "" }, { value: "" }],
    [{value: '',},{ value: "" }, { value: "" }],
  ];
  return (
    <Spreadsheet
      data={data}
      columnLabels={columnLabels}
      darkMode={darkMode}
      // rowLabels={rowLabels}
    />
  );
};