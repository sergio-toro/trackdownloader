import React from "react";
import Input from "@components/forms/Input";
import Card from "@components/layout/Card";
import { useSettings } from "@renderer/context/settingsContext";

export default function XContestCredentialsForm() {
  const {
    settings: { xcontest },
    setXContest,
  } = useSettings();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setXContest({
      ...xcontest,
      username: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setXContest({
      ...xcontest,
      password: e.target.value,
    });
  };

  return (
    <Card title="XContest">
      <Input
        id="xcontest-username"
        name="xcontestUsername"
        label="Username"
        value={xcontest?.username}
        onChange={handleUsernameChange}
      />
      <Input
        id="xcontest-password"
        name="xcontestPassword"
        label="Password"
        type="password"
        value={xcontest?.password}
        onChange={handlePasswordChange}
      />
    </Card>
  );
}
