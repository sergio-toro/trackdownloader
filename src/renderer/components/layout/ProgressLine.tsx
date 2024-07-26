import React from "react";

type Props = {
  percent: number;
};

const ProgressLine = ({ percent }: Props) => {
  // Ensure percent is between 0 and 100
  const validPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="w-full bg-gray-200 rounded-full h-5">
      <div
        className="bg-blue-500 h-5 rounded-full text-white text-center text-sm"
        style={{ width: `${validPercent}%` }}
      >
        {validPercent}%
      </div>
    </div>
  );
};

export default ProgressLine;
