import React from "react";

interface ButtonProps {
  onClick: () => void;
  color: string;
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  color,
  children,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={`${color} p-2 rounded-md  ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
