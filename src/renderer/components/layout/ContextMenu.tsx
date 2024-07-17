import React, { useEffect, useRef } from "react";

interface ContextMenuOption {
  label: string;
  handle: () => void;
}

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  options: ContextMenuOption[];
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  x,
  y,
  onClose,
  options,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkIfClickedOutside = (e: MouseEvent) => {
      if (isOpen && ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", checkIfClickedOutside);

    return () => {
      document.removeEventListener("mousedown", checkIfClickedOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="fixed z-200 bg-white shadow-lg rounded-md"
      style={{ top: `${y}px`, left: `${x}px` }}
    >
      {options.map((option, index) => (
        <div
          key={index}
          className="p-2 text-sm hover:bg-gray-100 cursor-pointer"
          onClick={() => {
            option.handle();
            onClose();
          }}
        >
          {option.label}
        </div>
      ))}
    </div>
  );
};

export default ContextMenu;
