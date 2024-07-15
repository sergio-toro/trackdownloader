import React, { createContext, useEffect, useState, useContext } from "react";

export interface SettingsState {
  darkTheme: boolean;
  flymaster: null | { username: string; password: string };
  xcontest: null | { username: string; password: string };
  selectedGroup: null | { id: string; name: string };
}

interface SettingsContextProps {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  setDarkTheme: (darkTheme: boolean) => void;
  setFlymaster: (flymaster: SettingsState["flymaster"]) => void;
  setXContest: (xcontest: SettingsState["xcontest"]) => void;
  setSelectedGroup: (selectedGroup: SettingsState['selectedGroup']) => void;
}

const initialContext: SettingsContextProps = {
  settings: {
    darkTheme: true,
    flymaster: null,
    xcontest: null,
    selectedGroup: null,
  },
  setSettings: () => {},
  setDarkTheme: () => {},
  setFlymaster: () => {},
  setXContest: () => {},
  setSelectedGroup: () => {},
};

const SettingsContext = createContext<SettingsContextProps>(initialContext);

export const useSettings = () => useContext(SettingsContext);


// SettingsProvider component
type Props = {
  children: React.ReactNode;
};

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
    setDarkTheme: (darkTheme: boolean) => {
      setSettings((prevSettings) => ({ ...prevSettings, darkTheme }));
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
    setSelectedGroup: (selectedGroup: SettingsState['selectedGroup']) => {
      setSettings((prevSettings) => ({ ...prevSettings, selectedGroup }));
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
};
