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
  xctrack: string | null;
  volandoo: string | null;
}

export interface SettingsState {
  theme: "dark" | "light";
  flymaster: null | FlymasterState;
  pilots: null | PilotsState[];
  xcontest: null | { username: string; password: string };
}

interface SettingsContextProps {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  setPilots: (pilots: PilotsState[] | null) => void;
  setTheme: (theme: "dark" | "light") => void;
  setFlymaster: (flymaster: FlymasterState | null) => void;
  setXContest: (xcontest: SettingsState["xcontest"]) => void;
}

const initialContext: SettingsContextProps = {
  settings: {
    theme: "dark",
    flymaster: null,
    xcontest: null,
    pilots: null,
  },
  setSettings: () => {},
  setPilots: () => {},
  setTheme: () => {},
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

  const contextValue = {
    settings,
    setSettings,
    setPilots: (pilots: PilotsState[] | null) => {
      setSettings((prevSettings) => ({ ...prevSettings, pilots }));
    },
    setTheme: (theme: "dark" | "light") => {
      setSettings((prevSettings) => ({ ...prevSettings, theme }));
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

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
    if (settings.theme === "dark") {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
