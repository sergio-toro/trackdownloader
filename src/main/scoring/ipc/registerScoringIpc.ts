/**
 * IPC handler registration for scoring module
 */

import { BrowserWindow, dialog, ipcMain } from "electron";
import { createStorage } from "../storage";
import { parseXctskFile, previewXctskFile } from "../import/xctaskImporter";
import type {
  CreateCompetitionData,
  TaskDefinition,
  Participant,
  ScoringFormulaConfig,
  TaskResult,
  CompetitionResult,
} from "../types";

const storage = createStorage();

export default function registerScoringIpc(appWindow: BrowserWindow) {
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
        return await storage.getCompetitionResults(compId);
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
}
