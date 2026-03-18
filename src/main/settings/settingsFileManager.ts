import fs from "fs/promises";
import path from "path";
import { app } from "electron";

export interface PersistedSettings {
  flymaster: {
    username: string;
    password: string;
    groups: Array<{ id: string; name: string }>;
    selectedGroup: { id: string; name: string } | null;
  } | null;
  xcontest: { username: string; password: string } | null;
  pilots: Array<{
    id: number;
    name: string;
    xcontest: string | null;
    volandoo: string | null;
    league: string | null;
  }> | null;
  debug: boolean;
  programDataFolder: string;
}

const DEFAULT_SETTINGS: PersistedSettings = {
  flymaster: null,
  xcontest: null,
  pilots: null,
  debug: false,
  programDataFolder: "",
};

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export async function loadSettings(): Promise<PersistedSettings> {
  try {
    const data = await fs.readFile(getSettingsPath(), "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  await fs.writeFile(
    getSettingsPath(),
    JSON.stringify(settings, null, 2),
    "utf-8"
  );
}
