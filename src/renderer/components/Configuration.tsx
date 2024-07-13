import React, { useContext } from 'react';
import { SettingsContext } from '@renderer/appRenderer';

export default function Configuration() {
  const settings = useContext(SettingsContext);
  return (
    <div className="">
      <h1>Configuration</h1>

      <div>
        <h2>Flymaster</h2>
        <div>
          <label>Username</label>
          <input type="text" value={settings.flymaster?.username} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={settings.flymaster?.password} />
        </div>
      </div>

      <div>
        <h2>XContest</h2>
        <div>
          <label>Username</label>
          <input type="text" value={settings.xcontest?.username} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={settings.xcontest?.password} />
        </div>
      </div>
    </div>
  );
}