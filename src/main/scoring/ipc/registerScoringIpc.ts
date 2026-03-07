/**
 * IPC handler registration for scoring module
 */

import fs from "fs/promises";
import path from "path";
import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import {
  createStorage,
  migrateStorage,
  getDefaultStoragePath,
} from "../storage";
import { parseXctskFile, previewXctskFile } from "../import/xctaskImporter";
import { analyzeFlightForTask, readIgcFile } from "../analysis";
import { scoreTask } from "../scoring";
import { calculateCompetitionStandings } from "../scoring/ftvCalculator";
import { exportToCsv } from "../export/csvExporter";
import { exportToHtml } from "../export/htmlExporter";
import { getDefaultFormula } from "../types/formula";
import { calculateTaskDistances } from "../geo/shortestRoute";
import { createWaypointStorage, importCupFile } from "../waypoints";
import type {
  CreateCompetitionData,
  TaskDefinition,
  Participant,
  ScoringFormulaConfig,
  TaskResult,
  CompetitionResult,
  FlightAnalysisOptions,
  FormulaId,
  FlightAnalysis,
  WaypointFilter,
  LibraryWaypoint,
  ExportOptions,
} from "../types";

// Mutable storage reference to allow path changes at runtime
let storage = createStorage();
let currentStoragePath = getDefaultStoragePath();

// Waypoint library storage (shares the same base path)
const waypointStorage = createWaypointStorage(currentStoragePath);

export default function registerScoringIpc(appWindow: BrowserWindow) {
  // ============================================================
  // Storage Path Management
  // ============================================================

  ipcMain.handle("scoring-get-storage-path", async () => {
    return currentStoragePath;
  });

  ipcMain.handle(
    "scoring-set-storage-path",
    async (_, newPath: string, migrate: boolean) => {
      try {
        const oldPath = currentStoragePath;

        // If path is empty, use default
        const targetPath = newPath || getDefaultStoragePath();

        // If same path, nothing to do
        if (targetPath === oldPath) {
          return;
        }

        // Migrate data if requested
        if (migrate) {
          await migrateStorage(oldPath, targetPath);
        }

        // Create new storage instance with new path
        storage = createStorage(targetPath);
        currentStoragePath = targetPath;

        // Update waypoint storage path
        waypointStorage.setBaseDir(targetPath);

        console.log(`Storage path changed: ${oldPath} -> ${targetPath}`);
      } catch (error) {
        console.error("Error setting storage path:", error);
        throw error;
      }
    }
  );

  ipcMain.handle("scoring-get-temporal-path", async () => {
    const temporalPath = path.join(currentStoragePath, "downloads");
    // Ensure the directory exists
    await fs.mkdir(temporalPath, { recursive: true });
    return temporalPath;
  });

  ipcMain.handle(
    "scoring-get-competition-igc-folder",
    async (_, compId: string, taskId: string) => {
      // Use first 8 characters of task UUID for folder name
      const taskIdShort = taskId.substring(0, 8);
      const igcFolder = path.join(
        currentStoragePath,
        compId,
        "igcs",
        taskIdShort
      );
      // Ensure the directory exists
      await fs.mkdir(igcFolder, { recursive: true });
      return igcFolder;
    }
  );

  ipcMain.handle("scoring-open-folder", async (_, folderPath: string) => {
    await shell.openPath(folderPath);
  });

  // ============================================================
  // Competition Management
  // ============================================================

  ipcMain.handle(
    "scoring-create-competition",
    async (_, data: CreateCompetitionData) => {
      try {
        return await storage.createCompetition(data);
      } catch (error) {
        console.error("Error creating competition:", error);
        throw error;
      }
    }
  );

  ipcMain.handle("scoring-load-competition", async (_, id: string) => {
    try {
      return await storage.getCompetition(id);
    } catch (error) {
      console.error("Error loading competition:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "scoring-update-competition",
    async (_, id: string, updates: Record<string, unknown>) => {
      try {
        await storage.updateCompetition(id, updates);
      } catch (error) {
        console.error("Error updating competition:", error);
        throw error;
      }
    }
  );

  ipcMain.handle("scoring-delete-competition", async (_, id: string) => {
    try {
      await storage.deleteCompetition(id);
    } catch (error) {
      console.error("Error deleting competition:", error);
      throw error;
    }
  });

  ipcMain.handle("scoring-list-competitions", async () => {
    try {
      return await storage.listCompetitions();
    } catch (error) {
      console.error("Error listing competitions:", error);
      throw error;
    }
  });

  // ============================================================
  // Task Management
  // ============================================================

  ipcMain.handle(
    "scoring-add-task",
    async (_, compId: string, task: TaskDefinition) => {
      try {
        await storage.addTask(compId, task);
      } catch (error) {
        console.error("Error adding task:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-get-task",
    async (_, compId: string, taskId: string) => {
      try {
        return await storage.getTask(compId, taskId);
      } catch (error) {
        console.error("Error getting task:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-update-task",
    async (
      _,
      compId: string,
      taskId: string,
      updates: Partial<TaskDefinition>
    ) => {
      try {
        await storage.updateTask(compId, taskId, updates);
      } catch (error) {
        console.error("Error updating task:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-delete-task",
    async (_, compId: string, taskId: string) => {
      try {
        await storage.deleteTask(compId, taskId);
      } catch (error) {
        console.error("Error deleting task:", error);
        throw error;
      }
    }
  );

  ipcMain.handle("scoring-get-tasks", async (_, compId: string) => {
    try {
      return await storage.getTasks(compId);
    } catch (error) {
      console.error("Error getting tasks:", error);
      throw error;
    }
  });

  // ============================================================
  // Participant Management
  // ============================================================

  ipcMain.handle(
    "scoring-add-participant",
    async (_, compId: string, participant: Participant) => {
      try {
        await storage.addParticipant(compId, participant);
      } catch (error) {
        console.error("Error adding participant:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-get-participant",
    async (_, compId: string, participantId: number) => {
      try {
        return await storage.getParticipant(compId, participantId);
      } catch (error) {
        console.error("Error getting participant:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-update-participant",
    async (
      _,
      compId: string,
      participantId: number,
      updates: Partial<Participant>
    ) => {
      try {
        await storage.updateParticipant(compId, participantId, updates);
      } catch (error) {
        console.error("Error updating participant:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-delete-participant",
    async (_, compId: string, participantId: number) => {
      try {
        await storage.deleteParticipant(compId, participantId);
      } catch (error) {
        console.error("Error deleting participant:", error);
        throw error;
      }
    }
  );

  ipcMain.handle("scoring-get-participants", async (_, compId: string) => {
    try {
      return await storage.getParticipants(compId);
    } catch (error) {
      console.error("Error getting participants:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "scoring-set-participants",
    async (_, compId: string, participants: Participant[]) => {
      try {
        await storage.setParticipants(compId, participants);
      } catch (error) {
        console.error("Error setting participants:", error);
        throw error;
      }
    }
  );

  // ============================================================
  // Results Management
  // ============================================================

  ipcMain.handle(
    "scoring-save-task-results",
    async (_, compId: string, taskId: string, results: TaskResult) => {
      try {
        await storage.saveTaskResults(compId, taskId, results);
      } catch (error) {
        console.error("Error saving task results:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-get-task-results",
    async (_, compId: string, taskId: string) => {
      try {
        return await storage.getTaskResults(compId, taskId);
      } catch (error) {
        console.error("Error getting task results:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-save-competition-results",
    async (_, compId: string, results: CompetitionResult) => {
      try {
        await storage.saveCompetitionResults(compId, results);
      } catch (error) {
        console.error("Error saving competition results:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-get-competition-results",
    async (_, compId: string) => {
      try {
        const result = await storage.getCompetitionResults(compId);
        if (result) {
          // Migrate old taskPoints -> taskScores for persisted data
          for (const standing of result.standings) {
            const legacy = standing as unknown as {
              taskPoints?: Record<string, number>;
            };
            if (!standing.taskScores && legacy.taskPoints) {
              standing.taskScores = {};
              for (const [taskId, pts] of Object.entries(legacy.taskPoints)) {
                const isDiscarded = standing.discardedTasks.includes(taskId);
                standing.taskScores[taskId] = {
                  originalPoints: pts,
                  countingPoints: pts,
                  counting: !isDiscarded,
                };
              }
              delete legacy.taskPoints;
            }
          }
        }
        return result;
      } catch (error) {
        console.error("Error getting competition results:", error);
        throw error;
      }
    }
  );

  // ============================================================
  // Formula Management
  // ============================================================

  ipcMain.handle("scoring-get-formula", async (_, compId: string) => {
    try {
      return await storage.getScoringFormula(compId);
    } catch (error) {
      console.error("Error getting formula:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "scoring-update-formula",
    async (_, compId: string, formula: Partial<ScoringFormulaConfig>) => {
      try {
        await storage.updateScoringFormula(compId, formula);
      } catch (error) {
        console.error("Error updating formula:", error);
        throw error;
      }
    }
  );

  // ============================================================
  // File Operations
  // ============================================================

  ipcMain.handle("scoring-load-from-file", async (_, filePath: string) => {
    try {
      return await storage.loadFromFile(filePath);
    } catch (error) {
      console.error("Error loading from file:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "scoring-save-to-file",
    async (_, compId: string, filePath: string) => {
      try {
        await storage.saveToFile(compId, filePath);
      } catch (error) {
        console.error("Error saving to file:", error);
        throw error;
      }
    }
  );

  // ============================================================
  // File Dialogs
  // ============================================================

  ipcMain.handle(
    "scoring-select-file",
    async (_, type: "xctsk" | "igc" | "csv" | "json") => {
      const filters: Record<string, Electron.FileFilter[]> = {
        xctsk: [{ name: "XCTrack Task", extensions: ["xctsk"] }],
        igc: [{ name: "IGC Files", extensions: ["igc"] }],
        csv: [{ name: "CSV Files", extensions: ["csv"] }],
        json: [{ name: "JSON Files", extensions: ["json"] }],
      };

      const result = await dialog.showOpenDialog(appWindow, {
        properties: ["openFile"],
        filters: filters[type] || [{ name: "All Files", extensions: ["*"] }],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    }
  );

  ipcMain.handle("scoring-select-files", async (_, type: "igc") => {
    const filters: Record<string, Electron.FileFilter[]> = {
      igc: [{ name: "IGC Files", extensions: ["igc"] }],
    };

    const result = await dialog.showOpenDialog(appWindow, {
      properties: ["openFile", "multiSelections"],
      filters: filters[type] || [{ name: "All Files", extensions: ["*"] }],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return [];
  });

  ipcMain.handle(
    "scoring-select-save-path",
    async (_, defaultName: string, type: "json" | "csv" | "html") => {
      const filters: Record<string, Electron.FileFilter[]> = {
        json: [{ name: "JSON Files", extensions: ["json"] }],
        csv: [{ name: "CSV Files", extensions: ["csv"] }],
        html: [{ name: "HTML Files", extensions: ["html"] }],
      };

      const result = await dialog.showSaveDialog(appWindow, {
        defaultPath: defaultName,
        filters: filters[type] || [{ name: "All Files", extensions: ["*"] }],
      });

      if (!result.canceled && result.filePath) {
        return result.filePath;
      }
      return null;
    }
  );

  ipcMain.handle("scoring-select-directory", async () => {
    const result = await dialog.showOpenDialog(appWindow, {
      properties: ["openDirectory"],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // ============================================================
  // Task Import
  // ============================================================

  ipcMain.handle("scoring-import-xctsk", async (_, filePath: string) => {
    try {
      return await parseXctskFile(filePath);
    } catch (error) {
      console.error("Error importing xctsk file:", error);
      throw error;
    }
  });

  ipcMain.handle("scoring-preview-xctsk", async (_, filePath: string) => {
    try {
      return await previewXctskFile(filePath);
    } catch (error) {
      console.error("Error previewing xctsk file:", error);
      throw error;
    }
  });

  // ============================================================
  // Flight Analysis
  // ============================================================

  ipcMain.handle(
    "scoring-analyze-flight",
    async (
      _,
      igcPath: string,
      task: TaskDefinition,
      pilotId: number,
      options?: Partial<FlightAnalysisOptions>
    ) => {
      try {
        return await analyzeFlightForTask(igcPath, task, pilotId, options);
      } catch (error) {
        console.error("Error analyzing flight:", error);
        throw error;
      }
    }
  );

  ipcMain.handle("scoring-read-igc", async (_, igcPath: string) => {
    try {
      return await readIgcFile(igcPath);
    } catch (error) {
      console.error("Error reading IGC file:", error);
      throw error;
    }
  });

  // ============================================================
  // Task Scoring
  // ============================================================

  ipcMain.handle(
    "scoring-score-task",
    async (
      _,
      compId: string,
      taskId: string,
      formulaId?: FormulaId
    ): Promise<TaskResult> => {
      try {
        // Load task definition
        const task = await storage.getTask(compId, taskId);
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        // Recalculate task distances using current shortest route algorithm
        if (task.turnpoints.length >= 2) {
          const distances = calculateTaskDistances(
            task.turnpoints,
            task.ssIndex,
            task.esIndex
          );
          task.taskDistance = distances.taskDistance;
          task.speedSectionDistance = distances.speedSectionDistance;
          task.launchToEssDistance = distances.launchToEssDistance;
          task.legDistances = distances.legDistances;
          task.shortestRoute = distances.shortestRoute;

          // Persist recalculated distances
          await storage.updateTask(compId, taskId, {
            taskDistance: task.taskDistance,
            speedSectionDistance: task.speedSectionDistance,
            launchToEssDistance: task.launchToEssDistance,
            legDistances: task.legDistances,
            shortestRoute: task.shortestRoute,
          });
        }

        // Load formula (use stored or default)
        let formula: ScoringFormulaConfig;
        try {
          formula = await storage.getScoringFormula(compId);
          if (formulaId && formula.name !== formulaId) {
            formula = getDefaultFormula(formulaId);
          }
        } catch {
          formula = getDefaultFormula(formulaId || "GAP2023");
        }

        // Load all participants and analyze their flights
        const participants = await storage.getParticipants(compId);
        const analyses: FlightAnalysis[] = [];

        for (const participant of participants) {
          // Find track for this task
          const track = participant.taskTracks?.find(
            (t) => t.taskId === taskId
          );
          if (
            track?.igcPath &&
            track.status !== "ABS" &&
            track.status !== "DNS"
          ) {
            try {
              // Analyze the flight
              const analysis = await analyzeFlightForTask(
                track.igcPath,
                task,
                participant.id,
                {
                  minDistance: formula.minimumDistance,
                  radiusTolerance: formula.turnpointRadiusTolerance,
                  minAbsTolerance:
                    formula.turnpointRadiusMinimumAbsoluteTolerance,
                  scoringAltitude:
                    formula.scoringAltitude === "GPS" ? "GPS" : "QNH",
                  useLegacyLandingDetection: formula.useLegacyLandingDetection,
                }
              );
              analyses.push(analysis);
            } catch (err) {
              console.warn(
                `Failed to analyze flight for participant ${participant.id}:`,
                err
              );
            }
          }
        }

        // Deduplicate analyses by pilotId (in case of duplicate participants)
        const seen = new Set<number>();
        const uniqueAnalyses = analyses.filter((a) => {
          if (seen.has(a.pilotId)) return false;
          seen.add(a.pilotId);
          return true;
        });

        if (uniqueAnalyses.length === 0) {
          throw new Error("No valid flight tracks found for scoring");
        }

        // Score the task
        const result = await scoreTask({
          task,
          analyses: uniqueAnalyses,
          formula,
          onProgress: (percent, message) => {
            // Could emit progress to renderer via appWindow.webContents.send
            console.log(`Scoring progress: ${percent}% - ${message}`);
          },
        });

        // Save results
        await storage.saveTaskResults(compId, taskId, result);

        return result;
      } catch (error) {
        console.error("Error scoring task:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-score-task-with-analyses",
    async (
      _,
      task: TaskDefinition,
      analyses: FlightAnalysis[],
      formulaId?: FormulaId
    ): Promise<TaskResult> => {
      try {
        const formula = getDefaultFormula(formulaId || "GAP2023");

        const result = await scoreTask({
          task,
          analyses,
          formula,
          onProgress: (percent, message) => {
            console.log(`Scoring progress: ${percent}% - ${message}`);
          },
        });

        return result;
      } catch (error) {
        console.error("Error scoring task:", error);
        throw error;
      }
    }
  );

  // ============================================================
  // Waypoint Library Management
  // ============================================================

  ipcMain.handle(
    "scoring-list-waypoints",
    async (_, filter?: WaypointFilter) => {
      try {
        return await waypointStorage.list(filter);
      } catch (error) {
        console.error("Error listing waypoints:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-add-waypoint",
    async (
      _,
      waypoint: Omit<LibraryWaypoint, "id" | "createdAt" | "updatedAt">
    ) => {
      try {
        return await waypointStorage.add(waypoint);
      } catch (error) {
        console.error("Error adding waypoint:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-update-waypoint",
    async (
      _,
      id: string,
      updates: Partial<Omit<LibraryWaypoint, "id" | "createdAt">>
    ) => {
      try {
        return await waypointStorage.update(id, updates);
      } catch (error) {
        console.error("Error updating waypoint:", error);
        throw error;
      }
    }
  );

  ipcMain.handle("scoring-delete-waypoint", async (_, id: string) => {
    try {
      await waypointStorage.delete(id);
    } catch (error) {
      console.error("Error deleting waypoint:", error);
      throw error;
    }
  });

  ipcMain.handle("scoring-delete-waypoints", async (_, ids: string[]) => {
    try {
      await waypointStorage.deleteMany(ids);
    } catch (error) {
      console.error("Error deleting waypoints:", error);
      throw error;
    }
  });

  ipcMain.handle("scoring-import-cup", async (_, filePath?: string) => {
    try {
      // If no path provided, open file dialog
      let cupPath = filePath;
      if (!cupPath) {
        const result = await dialog.showOpenDialog(appWindow, {
          properties: ["openFile"],
          filters: [{ name: "SeeYou Waypoints", extensions: ["cup"] }],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return null;
        }
        cupPath = result.filePaths[0];
      }

      return await importCupFile(cupPath, waypointStorage, true);
    } catch (error) {
      console.error("Error importing CUP file:", error);
      throw error;
    }
  });

  // ============================================================
  // Competition Standings (FTV)
  // ============================================================

  ipcMain.handle(
    "scoring-calculate-standings",
    async (_, compId: string): Promise<CompetitionResult> => {
      try {
        // Load competition
        const competition = await storage.getCompetition(compId);
        if (!competition) {
          throw new Error(`Competition ${compId} not found`);
        }

        // Load all task results
        const tasks = await storage.getTasks(compId);
        const taskResults: TaskResult[] = [];

        for (const task of tasks) {
          const result = await storage.getTaskResults(compId, task.id);
          if (result) {
            taskResults.push(result);
          }
        }

        if (taskResults.length === 0) {
          throw new Error("No scored tasks found for competition");
        }

        // Calculate standings with FTV
        const result = calculateCompetitionStandings(
          taskResults,
          competition.participants,
          competition.formula
        );

        // Set competition ID
        result.competitionId = compId;

        // Save results
        await storage.saveCompetitionResults(compId, result);

        return result;
      } catch (error) {
        console.error("Error calculating standings:", error);
        throw error;
      }
    }
  );

  // ============================================================
  // Export
  // ============================================================

  ipcMain.handle(
    "scoring-export-csv",
    async (_, compId: string, options: ExportOptions) => {
      try {
        // Load competition
        const competition = await storage.getCompetition(compId);
        if (!competition) {
          throw new Error(`Competition ${compId} not found`);
        }

        // Load or calculate standings
        let competitionResult = await storage.getCompetitionResults(compId);
        if (!competitionResult) {
          // Calculate standings first
          const tasks = await storage.getTasks(compId);
          const taskResults: TaskResult[] = [];

          for (const task of tasks) {
            const result = await storage.getTaskResults(compId, task.id);
            if (result) {
              taskResults.push(result);
            }
          }

          if (taskResults.length === 0) {
            throw new Error("No scored tasks found for competition");
          }

          competitionResult = calculateCompetitionStandings(
            taskResults,
            competition.participants,
            competition.formula
          );
          competitionResult.competitionId = compId;
        }

        // Load task results
        const taskResults: TaskResult[] = [];
        if (options.includeTaskResults) {
          const tasks = await storage.getTasks(compId);
          for (const task of tasks) {
            const result = await storage.getTaskResults(compId, task.id);
            if (result) {
              taskResults.push(result);
            }
          }
        }

        // Open directory picker
        const dirResult = await dialog.showOpenDialog(appWindow, {
          properties: ["openDirectory"],
          title: "Select export directory",
        });

        if (dirResult.canceled || dirResult.filePaths.length === 0) {
          return null;
        }

        const outputDir = dirResult.filePaths[0];

        // Export
        const exportResult = await exportToCsv(
          competition,
          competitionResult,
          taskResults,
          {
            outputDir,
            includeStandings: options.includeStandings,
            includeTaskResults: options.includeTaskResults,
            decimals: competition.formula.numberOfDecimalsTaskResults,
          }
        );

        return exportResult;
      } catch (error) {
        console.error("Error exporting CSV:", error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    "scoring-export-html",
    async (_, compId: string, options: ExportOptions) => {
      try {
        // Load competition
        const competition = await storage.getCompetition(compId);
        if (!competition) {
          throw new Error(`Competition ${compId} not found`);
        }

        // Load or calculate standings
        let competitionResult = await storage.getCompetitionResults(compId);
        if (!competitionResult) {
          // Calculate standings first
          const tasks = await storage.getTasks(compId);
          const taskResults: TaskResult[] = [];

          for (const task of tasks) {
            const result = await storage.getTaskResults(compId, task.id);
            if (result) {
              taskResults.push(result);
            }
          }

          if (taskResults.length === 0) {
            throw new Error("No scored tasks found for competition");
          }

          competitionResult = calculateCompetitionStandings(
            taskResults,
            competition.participants,
            competition.formula
          );
          competitionResult.competitionId = compId;
        }

        // Load task results
        const taskResults: TaskResult[] = [];
        const tasks = await storage.getTasks(compId);
        for (const task of tasks) {
          const result = await storage.getTaskResults(compId, task.id);
          if (result) {
            taskResults.push(result);
          }
        }

        // Open save dialog
        const saveResult = await dialog.showSaveDialog(appWindow, {
          defaultPath: `${competition.name.replace(/[^a-zA-Z0-9]/g, "_")}_results.html`,
          filters: [{ name: "HTML Files", extensions: ["html"] }],
          title: "Save HTML report",
        });

        if (saveResult.canceled || !saveResult.filePath) {
          return null;
        }

        // Export
        const outputPath = await exportToHtml(
          competition,
          competitionResult,
          taskResults,
          {
            outputPath: saveResult.filePath,
            includeStandings: options.includeStandings,
            includeTaskResults: options.includeTaskResults,
            decimals: competition.formula.numberOfDecimalsTaskResults,
          }
        );

        return outputPath;
      } catch (error) {
        console.error("Error exporting HTML:", error);
        throw error;
      }
    }
  );
}
