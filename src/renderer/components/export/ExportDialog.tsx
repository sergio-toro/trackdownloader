/**
 * Export dialog component
 *
 * Modal dialog for exporting competition results
 */

import React, { useState } from "react";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  competitionId: string;
  competitionName: string;
  hasCategories?: boolean;
  hasTeams?: boolean;
}

type ExportFormat = "csv" | "html";

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  competitionId,
  competitionName,
  hasCategories = false,
  hasTeams = false,
}) => {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [includeStandings, setIncludeStandings] = useState(true);
  const [includeTaskResults, setIncludeTaskResults] = useState(true);
  const [includeCategories, setIncludeCategories] = useState(true);
  const [includeTeams, setIncludeTeams] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const options = {
        format,
        includeStandings,
        includeTaskResults,
        includeCategories: hasCategories && includeCategories,
        includeTeams: hasTeams && includeTeams,
      };

      let result:
        | string
        | null
        | { standingsFile?: string; taskFiles: string[] };

      if (format === "csv") {
        result = await window.scoring.exportCsv(competitionId, options);
        if (result && typeof result === "object") {
          const files: string[] = [];
          if (result.standingsFile) files.push("standings.csv");
          files.push(...result.taskFiles.map((f) => f.split("/").pop() || f));
          setSuccess(`Exported ${files.length} file(s): ${files.join(", ")}`);
        }
      } else {
        result = await window.scoring.exportHtml(competitionId, options);
        if (result) {
          setSuccess(`Exported to ${result}`);
        }
      }

      if (!result) {
        setError("Export cancelled");
      }
    } catch (err) {
      console.error("Export failed:", err);
      setError(`Export failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Export Results
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Competition name */}
          <div className="text-sm text-gray-500">
            Exporting: <strong>{competitionName}</strong>
          </div>

          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat("csv")}
                className={`p-3 rounded-lg border text-left ${
                  format === "csv"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">CSV</div>
                <div className="text-xs text-gray-500">
                  Spreadsheet compatible
                </div>
              </button>
              <button
                onClick={() => setFormat("html")}
                className={`p-3 rounded-lg border text-left ${
                  format === "html"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-900">HTML</div>
                <div className="text-xs text-gray-500">Printable report</div>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Include
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeStandings}
                onChange={(e) => setIncludeStandings(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Overall standings</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeTaskResults}
                onChange={(e) => setIncludeTaskResults(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Individual task results</span>
            </label>
            {hasCategories && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeCategories}
                  onChange={(e) => setIncludeCategories(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Category results</span>
              </label>
            )}
            {hasTeams && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeTeams}
                  onChange={(e) => setIncludeTeams(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Team results</span>
              </label>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            {success ? "Close" : "Cancel"}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || (!includeStandings && !includeTaskResults)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
