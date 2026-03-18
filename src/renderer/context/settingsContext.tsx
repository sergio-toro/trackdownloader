import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface FlymasterGroup {
  id: string;
  name: string;
}

interface FlymasterState {
  username: string;
  password: string;
  groups: FlymasterGroup[];
  selectedGroup: FlymasterGroup | null;
}

export interface PilotsState {
  id: number;
  name: string;
  xcontest: string | null;
  volandoo: string | null;
  league: string | null;
}

export interface SettingsState {
  flymaster: null | FlymasterState;
  pilots: null | PilotsState[];
  xcontest: null | { username: string; password: string };
  debug: boolean;
  leagues: string[];
  programDataFolder: string;
}

interface SettingsContextProps {
  settings: SettingsState;
  settingsLoaded: boolean;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  setDebug: (debug: boolean) => void;
  setPilots: (pilots: PilotsState[] | null) => void;
  setFlymaster: (flymaster: FlymasterState | null) => void;
  setXContest: (xcontest: SettingsState["xcontest"]) => void;
  setProgramDataFolder: (programDataFolder: string) => void;
}

const defaultSettings: SettingsState = {
  flymaster: null,
  xcontest: null,
  pilots: null,
  debug: false,
  leagues: [],
  programDataFolder: "",
};

const initialContext: SettingsContextProps = {
  settings: defaultSettings,
  settingsLoaded: false,
  setDebug: () => {},
  setSettings: () => {},
  setPilots: () => {},
  setFlymaster: () => {},
  setXContest: () => {},
  setProgramDataFolder: () => {},
};

const SettingsContext = createContext<SettingsContextProps>(initialContext);

export const useSettings = () => useContext(SettingsContext);

function toPersistedSettings(settings: SettingsState) {
  const { leagues: _leagues, ...rest } = settings;
  return rest;
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const initialized = useRef(false);

  // Load settings from disk on mount
  useEffect(() => {
    (async () => {
      try {
        const persisted = await window.appSettings.load();
        const loaded: SettingsState = {
          ...defaultSettings,
          ...persisted,
          leagues: [],
        };
        // Derive leagues from pilots
        if (loaded.pilots) {
          const leagues: string[] = [];
          loaded.pilots.forEach((pilot) => {
            if (pilot.league && !leagues.includes(pilot.league)) {
              leagues.push(pilot.league);
            }
          });
          loaded.leagues = leagues;
        }
        setSettings(loaded);
        initialized.current = true;

        // Initialize program data storage path before signaling loaded
        if (loaded.programDataFolder) {
          await window.scoring.setStoragePath(loaded.programDataFolder, false);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        initialized.current = true;
      } finally {
        setSettingsLoaded(true);
      }
    })();
  }, []);

  // Persist settings to disk on change (skip initial load)
  const persistSettings = useCallback((updated: SettingsState) => {
    if (!initialized.current) return;
    window.appSettings.save(toPersistedSettings(updated)).catch((error) => {
      console.error("Failed to save settings:", error);
    });
  }, []);

  useEffect(() => {
    persistSettings(settings);
  }, [settings, persistSettings]);

  useEffect(() => {
    if (settings.pilots) {
      const leagues: string[] = [];
      settings.pilots.forEach((pilot) => {
        if (pilot.league && !leagues.includes(pilot.league)) {
          leagues.push(pilot.league);
        }
      });
      setSettings((prevSettings) => ({ ...prevSettings, leagues }));
    }
  }, [settings.pilots]);

  const contextValue = {
    settings,
    settingsLoaded,
    setSettings,
    setDebug: (debug: boolean) => {
      setSettings((prevSettings) => ({ ...prevSettings, debug }));
    },
    setPilots: (pilots: PilotsState[] | null) => {
      setSettings((prevSettings) => ({ ...prevSettings, pilots }));
    },
    setFlymaster: (flymaster: SettingsState["flymaster"]) => {
      setSettings((prevSettings) => ({
        ...prevSettings,
        flymaster,
      }));
    },
    setXContest: (xcontest: SettingsState["xcontest"]) => {
      setSettings((prevSettings) => ({ ...prevSettings, xcontest }));
    },
    setProgramDataFolder: (
      programDataFolder: SettingsState["programDataFolder"]
    ) => {
      setSettings((prevSettings) => ({ ...prevSettings, programDataFolder }));
    },
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
