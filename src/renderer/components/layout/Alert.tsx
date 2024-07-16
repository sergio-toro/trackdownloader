import React from "react";

interface AlertProps {
  variant: "info" | "warning" | "error" | "success";
  children: React.ReactNode;
}

const variantStyles = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  success: "bg-green-100 text-green-800",
};

const Alert: React.FC<AlertProps> = ({ variant, children }) => {
  return (
    <div className={`p-2 rounded-sm ${variantStyles[variant]}`}>{children}</div>
  );
};

export default Alert;
