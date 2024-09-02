import React, { useState, ReactElement } from "react";

interface TabProps {
  label: string;
  children: React.ReactNode;
}

interface TabsProps {
  children: ReactElement<TabProps>[];
}

export const Tabs: React.FC<TabsProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="tabs">
      <div className="tab-list flex border-b-4 border-zinc-200 font-semibold">
        {children.map((tab, index) => (
          <button
            key={index}
            className={`tab ${index === activeTab ? "active" : ""} px-4 py-2`}
            onClick={() => setActiveTab(index)}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className="tab-content">{children[activeTab]}</div>
    </div>
  );
};
