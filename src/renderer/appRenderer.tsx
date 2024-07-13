import React from 'react';
import { createRoot } from 'react-dom/client';
import WindowFrame from '@renderer/window/WindowFrame';
import Application from '@renderer/Application';

// Say something
console.log('[Track Downloader]: Renderer execution started');

const platform = window.app.platform === 'darwin' ? 'mac' : 'windows';

// Application to Render
const app = (
  <WindowFrame title='Track Downloader' platform={platform}>
    <Application />
  </WindowFrame>
);

// Render application in DOM
createRoot(document.getElementById('app')).render(app);
