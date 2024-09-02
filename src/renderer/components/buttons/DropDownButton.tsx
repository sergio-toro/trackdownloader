import React, { useState, ReactNode } from "react";

interface DropDownButtonProps {
  text: string;
  children: ReactNode;
}

const DropDownButton: React.FC<DropDownButtonProps> = ({ text, children }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className="flex-grow relative pb-1">
      <button
        className="font-bold text-xl text-black flex items-center gap-1"
        id="menu-button"
        onClick={toggleDropdown}
      >
        {text}
        <svg
          className={`-mr-1 h-6 w-6 text-gray-700 transition-transform ${
            dropdownOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {dropdownOpen && <div className="min-w-full mt-2 z-10">{children}</div>}
    </div>
  );
};

export default DropDownButton;
