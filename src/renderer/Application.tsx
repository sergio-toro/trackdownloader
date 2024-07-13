import React, { useEffect, useState } from 'react';

import '@styles/main.css';
import '@styles/app.scss';
import PilotsSheet from '@components/PilotsSheet';
import Configuration from '@components/Configuration';


const Application: React.FC = () => {
  const [darkTheme, setDarkTheme] = useState(true);

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
    <div id="application" className="w-full">
      <div className="w-full p-4 pb-0">

        <div className="main-teaser">
          Settings
        </div>
        <Configuration />
      </div>

      <div className="content">
        <PilotsSheet darkMode={darkTheme} />
      </div>

      <div className="footer">
        <div className="center">
          <button onClick={toggleTheme}>
            {darkTheme ? 'Light Theme' : 'Dark Theme'}
          </button>
          &nbsp;&nbsp; &nbsp;&nbsp;

          <button onClick={async () => {
            console.log('WINDOW!', window.scrappers);
            const response = await window.scrappers.test('storo90');

            console.log('RESPONSE', response);
          }}>
            TEST SCRAPPING
          </button>
        </div>
      </div>
    </div>
  );
};

export default Application;
