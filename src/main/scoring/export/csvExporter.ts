/**
 * CSV Exporter
 *
 * Exports competition standings and task results to CSV format.
 */

import * as fs from "fs";
import * as path from "path";
import type { Competition } from "../types/competition";
import type { CompetitionResult, TaskResult } from "../types/results";
import type { Participant } from "../types/participant";

/**
 * CSV export options
 */
export interface CsvExportOptions {
  /** Output directory path */
  outputDir: string;

  /** Include task results (individual CSV per task) */
  includeTaskResults: boolean;

  /** Include standings (overall competition) */
  includeStandings: boolean;

  /** Decimal places for points */
  decimals?: number;
}

/**
 * Export result info
 */
export interface CsvExportResult {
  standingsFile?: string;
  taskFiles: string[];
}

/**
 * Export competition results to CSV files
 *
 * @param competition Competition data
 * @param competitionResult Competition result with standings
 * @param taskResults Task results (for individual task exports)
 * @param options Export options
 * @returns Export result with file paths
 */
export async function exportToCsv(
  competition: Competition,
  competitionResult: CompetitionResult,
  taskResults: TaskResult[],
  options: CsvExportOptions
): Promise<CsvExportResult> {
  const result: CsvExportResult = { taskFiles: [] };

  // Build participant lookup
  const participantMap = new Map<number, Participant>();
  for (const p of competition.participants) {
    participantMap.set(p.id, p);
  }

  // Build task name lookup
  const taskNameMap = new Map<string, string>();
  for (const t of competition.tasks) {
    taskNameMap.set(t.id, t.name);
  }

  // Export standings
  if (options.includeStandings) {
    const filename = sanitizeFilename(`${competition.name}_standings.csv`);
    const filepath = path.join(options.outputDir, filename);

    const csv = generateStandingsCsv(
      competition,
      competitionResult,
      taskResults,
      participantMap,
      taskNameMap,
      options.decimals ?? 0
    );

    await fs.promises.writeFile(filepath, csv, "utf-8");
    result.standingsFile = filepath;
  }

  // Export individual task results
  if (options.includeTaskResults) {
    for (const taskResult of taskResults) {
      const taskName = taskNameMap.get(taskResult.taskId) || taskResult.taskId;
      const filename = sanitizeFilename(`${competition.name}_${taskName}.csv`);
      const filepath = path.join(options.outputDir, filename);

      const csv = generateTaskResultCsv(
        taskResult,
        participantMap,
        options.decimals ?? 1
      );

      await fs.promises.writeFile(filepath, csv, "utf-8");
      result.taskFiles.push(filepath);
    }
  }

  return result;
}

/**
 * Generate standings CSV content
 */
function generateStandingsCsv(
  competition: Competition,
  competitionResult: CompetitionResult,
  taskResults: TaskResult[],
  participantMap: Map<number, Participant>,
  taskNameMap: Map<string, string>,
  decimals: number
): string {
  const rows: string[] = [];

  // Header row
  const headers = ["Rank", "Pilot", "Nation", "Glider"];

  // Add task columns
  const taskIds = taskResults.map((t) => t.taskId);
  for (const taskId of taskIds) {
    const name = taskNameMap.get(taskId) || taskId;
    headers.push(name);
  }
  headers.push("Total");

  rows.push(headers.map(escapeCsvField).join(","));

  // Data rows
  for (const standing of competitionResult.standings) {
    const participant = participantMap.get(standing.participantId);
    const row: string[] = [
      String(standing.rank),
      participant?.name || `Pilot ${standing.participantId}`,
      participant?.nation || "",
      participant?.glider || "",
    ];

    // Task points
    for (const taskId of taskIds) {
      const points = standing.taskPoints[taskId] ?? 0;
      const isDiscarded = standing.discardedTasks.includes(taskId);
      const formatted = formatPoints(points, decimals);
      // Mark discarded with parentheses
      row.push(isDiscarded ? `(${formatted})` : formatted);
    }

    // Total
    row.push(formatPoints(standing.totalPoints, decimals));

    rows.push(row.map(escapeCsvField).join(","));
  }

  return rows.join("\n");
}

/**
 * Generate task result CSV content
 */
function generateTaskResultCsv(
  taskResult: TaskResult,
  participantMap: Map<number, Participant>,
  decimals: number
): string {
  const rows: string[] = [];

  // Header row
  const headers = [
    "Rank",
    "Pilot",
    "Nation",
    "Glider",
    "Distance (km)",
    "Time",
    "Dist Pts",
    "Time Pts",
    "Lead Pts",
    "Penalty",
    "Total",
  ];
  rows.push(headers.map(escapeCsvField).join(","));

  // Sort by rank
  const sortedResults = [...taskResult.pilotResults].sort(
    (a, b) => a.rank - b.rank
  );

  // Data rows
  for (const result of sortedResults) {
    const participant = participantMap.get(result.pilotId);
    const row: string[] = [
      String(result.rank),
      participant?.name || `Pilot ${result.pilotId}`,
      participant?.nation || "",
      participant?.glider || "",
      formatDistance(result.distance),
      formatTime(result.time),
      formatPoints(result.distancePoints, decimals),
      formatPoints(result.timePoints, decimals),
      formatPoints(result.leadingPoints, decimals),
      result.penaltyPoints > 0
        ? formatPoints(-result.penaltyPoints, decimals)
        : "",
      formatPoints(result.totalPoints, decimals),
    ];

    rows.push(row.map(escapeCsvField).join(","));
  }

  // Summary row
  rows.push(""); // Empty line
  rows.push(`Day Quality:,${(taskResult.dayQuality * 100).toFixed(1)}%`);
  rows.push(
    `In Goal:,${taskResult.statistics.pilotsInGoal}/${taskResult.statistics.pilotsFlying}`
  );
  rows.push(
    `Best Distance:,${formatDistance(taskResult.statistics.bestDistance)}`
  );
  if (taskResult.statistics.bestTime > 0) {
    rows.push(`Best Time:,${formatTime(taskResult.statistics.bestTime)}`);
  }

  return rows.join("\n");
}

/**
 * Escape a CSV field value
 */
function escapeCsvField(value: string): string {
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format distance in km
 */
function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

/**
 * Format time as HH:MM:SS
 */
function formatTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format points with decimal places
 */
function formatPoints(points: number, decimals: number): string {
  return points.toFixed(decimals);
}

/**
 * Sanitize filename for filesystem
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[/\\?%*:|"<>]/g, "_");
}

/**
 * Export single task result to CSV string (for preview)
 */
export function taskResultToCsv(
  taskResult: TaskResult,
  participants: Participant[]
): string {
  const participantMap = new Map<number, Participant>();
  for (const p of participants) {
    participantMap.set(p.id, p);
  }
  return generateTaskResultCsv(taskResult, participantMap, 1);
}

/**
 * Export standings to CSV string (for preview)
 */
export function standingsToCsv(
  competition: Competition,
  competitionResult: CompetitionResult,
  taskResults: TaskResult[]
): string {
  const participantMap = new Map<number, Participant>();
  for (const p of competition.participants) {
    participantMap.set(p.id, p);
  }

  const taskNameMap = new Map<string, string>();
  for (const t of competition.tasks) {
    taskNameMap.set(t.id, t.name);
  }

  return generateStandingsCsv(
    competition,
    competitionResult,
    taskResults,
    participantMap,
    taskNameMap,
    0
  );
}
