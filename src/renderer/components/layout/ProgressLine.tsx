import React from "react";

type Props = {
  percent: number;
  detail?: string;
};

const ProgressLine = ({ percent, detail }: Props) => {
  // Ensure percent is between 0 and 100
  const validPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="w-full mt-4">
      {detail && <div className="text-sm text-gray-500">{detail}</div>}
      <div className="w-full bg-gray-200 rounded-full h-5 mt-1">
        <div
          className="bg-blue-500 h-5 rounded-full text-white text-center text-sm"
          style={{ width: `${validPercent}%` }}
        >
          {validPercent}%
        </div>
      </div>
    </div>
  );
};

export default ProgressLine;
