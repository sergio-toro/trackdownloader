import React from "react";

interface ScrapButtonProps {
  label: string;
  onClick: () => void;
  gradientClass?: string;
  border?: string;
}
const ScrapButton: React.FC<ScrapButtonProps> = ({
  label,
  onClick,
  gradientClass,
  border,
}) => {
  return (
    <button
      className={`text-sm ${gradientClass} ${border} text-white px-2 py-1 rounded-md shadow-md`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default ScrapButton;
