import React from "react";
import Input from "@components/forms/Input";
import Card from "@components/layout/Card";
import { useSettings } from "@renderer/context/settingsContext";

export default function FlymasterCredentialsForm() {
  const {
    settings: { flymaster },
    setFlymaster,
  } = useSettings();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFlymaster({
      ...flymaster,
      username: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFlymaster({
      ...flymaster,
      password: e.target.value,
    });
  };

  return (
    <Card title="Flymaster">
      <Input
        id="flymaster-username"
        name="flymasterUsername"
        label="Username"
        value={flymaster?.username}
        onChange={handleUsernameChange}
      />
      <Input
        id="flymaster-password"
        name="flymasterPassword"
        label="Password"
        type="password"
        value={flymaster?.password}
        onChange={handlePasswordChange}
      />
    </Card>
  );
}
