/**
 * Download progress indicator component
 *
 * Shows progress bar with detail message for track downloads
 */

import React from "react";
import type { ProgressState } from "@renderer/hooks/useCompetitionDownload";
import type { DownloadSource } from "@renderer/components/competition/PilotDownloadTable";

interface DownloadProgressIndicatorProps {
  progress: ProgressState;
  source: DownloadSource;
}

const getSourceColor = (source: DownloadSource): string => {
  switch (source) {
    case "xcontest":
      return "bg-blue-600";
    case "volandoo":
      return "bg-purple-600";
    case "flymaster":
      return "bg-orange-600";
    case "all":
      return "bg-green-600";
  }
};

const DownloadProgressIndicator: React.FC<DownloadProgressIndicatorProps> = ({
  progress,
  source,
}) => {
  if (!progress.visible) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 truncate max-w-[80%]">
          {progress.detail || "Processing..."}
        </span>
        <span className="text-gray-500 font-medium">{progress.percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full ${getSourceColor(source)} transition-all duration-300 ease-out`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
};

export default DownloadProgressIndicator;
