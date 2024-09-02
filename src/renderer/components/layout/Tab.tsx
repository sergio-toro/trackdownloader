import React from "react";

interface TabProps {
  label: string;
  children: React.ReactNode;
}

export const Tab: React.FC<TabProps> = ({ children }) => {
  return <div className="tab-panel">{children}</div>;
};
