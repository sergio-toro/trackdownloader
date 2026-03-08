import React, { useState, useRef, useEffect } from "react";

export interface DropdownOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface IconDropdownButtonProps {
  icon: React.ReactNode;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}

const IconDropdownButton: React.FC<IconDropdownButtonProps> = ({
  icon,
  options,
  onSelect,
  disabled,
  title,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        title={title}
        className={`p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 ${className}`}
      >
        {icon}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20 min-w-[120px]">
          {options.map((opt) => (
            <button
              key={opt.value}
              disabled={opt.disabled}
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default IconDropdownButton;
