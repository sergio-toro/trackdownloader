import React from 'react';

import '@styles/main.css';
import '@styles/app.scss';
import Configuration from '@components/Configuration';
import { useSettings } from '@renderer/context/settingsContext';


const Application: React.FC = () => {
  const { settings: { darkTheme }, setDarkTheme } = useSettings();


  return (
    <div id="application" className="w-full">
      <Configuration />


      <div className="footer">
        <div className="center">
          <button onClick={() => {
            setDarkTheme(!darkTheme);
          }}>
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
