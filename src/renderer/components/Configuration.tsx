import React, { useState } from 'react';
import Input from '@components/forms/Input';
import { useSettings } from '@renderer/context/settingsContext';
import Card from '@components/layout/Card';

export default function Configuration() {
  const { settings, setFlymaster, setXContest } = useSettings();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className=' text-left w-full'>
      <div>
        <button
          className=' w-full justify-start gap-x-1.5 font-bold text-xl'
          id='menu-button'
          onClick={toggleDropdown}
        >
          Config
          <svg className='-mr-1 h-5 w-5 text-gray-900'>
            <path d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' />
          </svg>
        </button>
      </div>

      {dropdownOpen && (
        <div
          className=' w-full rounded-md bg-white shadow-md flex gap-8'
          role='menu'
        >
          <Card title='Flymaster'>
            <Input
              id='flymaster-username'
              name='flymasterUsername'
              label='Username'
              value={settings.flymaster?.username}
              onChange={(e) => {
                setFlymaster({
                  ...settings.flymaster,
                  username: e.target.value,
                });
              }}
            />
            <Input
              id='flymaster-password'
              name='flymasterPassword'
              label='Password'
              type='password'
              value={settings.flymaster?.password}
              onChange={(e) => {
                setFlymaster({
                  ...settings.flymaster,
                  password: e.target.value,
                });
              }}
            />
          </Card>
          <Card title='XContest'>
            <Input
              id='xcontest-username'
              name='xcontestUsername'
              label='Username'
              value={settings.xcontest?.username}
              onChange={(e) => {
                setXContest({
                  ...settings.xcontest,
                  username: e.target.value,
                });
              }}
            />
            <Input
              id='xcontest-password'
              name='xcontestPassword'
              label='Password'
              type='password'
              value={settings.xcontest?.password}
              onChange={(e) => {
                setXContest({
                  ...settings.xcontest,
                  password: e.target.value,
                });
              }}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

