import React, { createContext, useEffect, useState } from "react";

export interface SettingsState {
  darkTheme: boolean;
  flymaster: null | {
    username: string;
    password: string;
  };
  xcontest: null | {
    username: string;
    password: string;
  };
}

interface SettingsContextType {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState | null>>;
  setDarkTheme: (darkTheme: boolean) => void;
  setFlymaster: (flymaster: SettingsState["flymaster"]) => void;
  setXContest: (xcontest: SettingsState["xcontest"]) => void;
}

const initialContext: SettingsContextType = {
  settings: {
    darkTheme: true,
    flymaster: null,
    xcontest: null,
  },
  setSettings: () => {},
  setDarkTheme: () => {},
  setFlymaster: () => {},
  setXContest: () => {},
};

export const SettingsContext =
  createContext<SettingsContextType>(initialContext);

export function useSettings() {
  return React.useContext(SettingsContext);
}

// SettingsProvider component
type Props = {
  children: React.ReactNode;
};

const LOCAL_STORAGE_KEY = "settings";

export function SettingsProvider({ children }: Props) {
  const [settings, setSettings] = useState<SettingsState | null>(() => {
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
    return storedSettings
      ? JSON.parse(storedSettings)
      : initialContext.settings;
  });

  const contextValue = {
    settings,
    setSettings,
    setDarkTheme: (darkTheme: boolean) => {
      setSettings((prevSettings) => ({
        ...prevSettings,
        darkTheme,
      }));
    },
    setFlymaster: (flymaster: SettingsState["flymaster"]) => {
      setSettings((prevSettings) => ({
        ...prevSettings,
        flymaster,
      }));
    },
    setXContest: (xcontest: SettingsState["xcontest"]) => {
      setSettings((prevSettings) => ({
        ...prevSettings,
        xcontest,
      }));
    },
  };

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
    if (settings.darkTheme) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}
