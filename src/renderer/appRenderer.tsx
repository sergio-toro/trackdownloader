import React from 'react';
import { createRoot } from 'react-dom/client';
import WindowFrame from '@renderer/window/WindowFrame';
import Application from '@renderer/Application';

// Say something
console.log('[Track Downloader]: Renderer execution started');

const platform = window.app.platform === 'darwin' ? 'mac' : 'windows';

type SettingsContextType = {
  flymaster: null | {
    username: string;
    password: string;
  };
  xcontest: null | {
    username: string;
    password: string;
  }
};

const flymasterSettings = localStorage.getItem('flymaster');
const xcontestSettings = localStorage.getItem('xcontest');
export const SettingsContext = React.createContext<SettingsContextType>({
  flymaster: null,
  xcontest: null,
});

// Application to Render
function MainApp() {
  const [settings, setSettings] = React.useState<SettingsContextType>({
    flymaster: flymasterSettings ? JSON.parse(flymasterSettings) : null,
    xcontest: xcontestSettings ? JSON.parse(xcontestSettings) : null,
  });
  return (
    <SettingsContext.Provider value={settings}>
      <WindowFrame title="Track Downloader">
        <Application />
      </WindowFrame>
    </SettingsContext.Provider>
  );
}


// Render application in DOM
createRoot(document.getElementById('app')).render(<MainApp />);
