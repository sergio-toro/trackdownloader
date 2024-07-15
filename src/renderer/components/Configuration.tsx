import React from "react";
import Input from "@components/forms/Input";
import { useSettings } from "@renderer/context/settingsContext";
import Card from "@components/layout/Card";
import PilotsSheet from "@components/PilotsSheet";

export default function Configuration() {
  const { settings, setFlymaster, setXContest } = useSettings();
  console.log("settings", settings);
  return (
    <div className="w-full p-4 pb-0">
      <div className="main-teaser pb-2 mb-2">Settings</div>
      <div className="grid grid-cols-2 gap-4">
        <Card title="Flymaster">
          <Input
            id="flymaster-username"
            name="flymasterUsername"
            label="Username"
            value={settings.flymaster?.username}
            onChange={(e) => {
              setFlymaster({
                ...settings.flymaster,
                username: e.target.value,
              });
            }}
          />
          <Input
            id="flymaster-password"
            name="flymasterPassword"
            label="Password"
            type="password"
            value={settings.flymaster?.password}
            onChange={(e) => {
              setFlymaster({
                ...settings.flymaster,
                password: e.target.value,
              });
            }}
          />
        </Card>
        <Card title="XContest">
          <Input
            id="xcontest-username"
            name="xcontestUsername"
            label="Username"
            value={settings.xcontest?.username}
            onChange={(e) => {
              setXContest({
                ...settings.xcontest,
                username: e.target.value,
              });
            }}
          />
          <Input
            id="xcontest-password"
            name="xcontestPassword"
            label="Password"
            type="password"
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
      <div className="content">
        <PilotsSheet darkMode={settings.darkTheme} />
      </div>
    </div>
  );
}
