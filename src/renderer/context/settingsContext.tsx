import React, { createContext, useContext, useState, useEffect } from "react";

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
  xctrack: string | null;
  volandoo: string | null;
}

export interface SettingsState {
  flymaster: null | FlymasterState;
  pilots: null | PilotsState[];
  xcontest: null | { username: string; password: string };
}

interface SettingsContextProps {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  setPilots: (pilots: PilotsState[] | null) => void;
  setFlymaster: (flymaster: FlymasterState | null) => void;
  setXContest: (xcontest: SettingsState["xcontest"]) => void;
}

const initialContext: SettingsContextProps = {
  settings: {
    flymaster: null,
    xcontest: null,
    pilots: null,
  },
  setSettings: () => {},
  setPilots: () => {},
  setFlymaster: () => {},
  setXContest: () => {},
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

  const contextValue = {
    settings,
    setSettings,
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
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
