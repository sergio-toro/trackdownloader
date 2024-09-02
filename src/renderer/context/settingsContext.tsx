import React, { createContext, useContext, useEffect, useState } from "react";

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
  temporalFolder: string;
}

interface SettingsContextProps {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  setDebug: (debug: boolean) => void;
  setPilots: (pilots: PilotsState[] | null) => void;
  setFlymaster: (flymaster: FlymasterState | null) => void;
  setXContest: (xcontest: SettingsState["xcontest"]) => void;
  setTemporalFolder: (temporalFolder: string) => void;
}

const initialContext: SettingsContextProps = {
  settings: {
    flymaster: null,
    xcontest: null,
    pilots: null,
    debug: false,
    leagues: [],
    temporalFolder: null,
  },
  setDebug: () => {},
  setSettings: () => {},
  setPilots: () => {},
  setFlymaster: () => {},
  setXContest: () => {},
  setTemporalFolder: () => {},
};

const SettingsContext = createContext<SettingsContextProps>(initialContext);

export const useSettings = () => useContext(SettingsContext);

const LOCAL_STORAGE_KEY = "settings";

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
    return storedSettings
      ? JSON.parse(storedSettings)
      : initialContext.settings;
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (settings.pilots) {
      const leagues = Array.from(
        new Set(settings.pilots.map((pilot) => pilot.league).filter(Boolean))
      ) as string[];
      setSettings((prevSettings) => ({ ...prevSettings, leagues }));
    }
  }, [settings.pilots]);

  const contextValue = {
    settings,
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
    setTemporalFolder: (temporalFolder: SettingsState["temporalFolder"]) => {
      setSettings((prevSettings) => ({ ...prevSettings, temporalFolder }));
    },
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
