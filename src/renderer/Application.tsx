import React, { useEffect, useState } from 'react';

import '@styles/main.css';
import '@styles/app.scss';
import PilotsSheet from '@components/PilotsSheet';


const Application: React.FC = () => {
  const [counter, setCounter] = useState(0);
  const [darkTheme, setDarkTheme] = useState(true);
  const [versions, setVersions] = useState<Record<string, string>>({});

  /**
   * On component mount
   */
  useEffect(() => {
    const useDarkTheme = parseInt(localStorage.getItem('dark-mode'));
    if (isNaN(useDarkTheme)) {
      setDarkTheme(true);
    } else if (useDarkTheme == 1) {
      setDarkTheme(true);
    } else if (useDarkTheme == 0) {
      setDarkTheme(false);
    }

    // Apply verisons
    const app = document.getElementById('app');
    const versions = JSON.parse(app.getAttribute('data-versions'));
    setVersions(versions);
  }, []);

  /**
   * On Dark theme change
   */
  useEffect(() => {
    if (darkTheme) {
      localStorage.setItem('dark-mode', '1');
      document.body.classList.add('dark-mode');
    } else {
      localStorage.setItem('dark-mode', '0');
      document.body.classList.remove('dark-mode');
    }
  }, [darkTheme]);

  /**
   * Toggle Theme
   */
  function toggleTheme() {
    setDarkTheme(!darkTheme);
  }

  return (
    <div id='application' className="w-full">
      <div className='header w-full'>
        <div className='main-heading'>
          <h1 className='themed'>TrackDownloader</h1>
        </div>
        <div className='main-teaser'>
          Desktop Application with Electron, React, Webpack & TypeScript
        </div>
      </div>

      <div className="content">
        <PilotsSheet darkMode={darkTheme}/>
      </div>

      <div className='footer'>
        <div className='center'>
          <button onClick={async () => {
            console.log("WINDOW!", window.scrappers);
            const response = await window.scrappers.test('storo90');

            console.log("RESPONSE", response);
          }}>
            TEST SCRAPPING
          </button>
        </div>
      </div>
    </div>
  );
};

export default Application;
