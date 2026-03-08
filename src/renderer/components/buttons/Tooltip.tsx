import React, { useState, useRef, useEffect } from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom";
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const left =
      triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    const top =
      position === "top"
        ? triggerRect.top - tooltipRect.height - 6
        : triggerRect.bottom + 6;
    setCoords({ top, left: Math.max(4, left) });
  }, [visible, position]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="inline-flex"
      >
        {children}
      </span>
      {visible && (
        <div
          ref={tooltipRef}
          style={coords ? { top: coords.top, left: coords.left } : undefined}
          className={`fixed z-50 px-2.5 py-1.5 text-xs bg-gray-900 text-white rounded shadow-lg whitespace-nowrap ${
            !coords ? "opacity-0" : "opacity-100"
          }`}
        >
          {content}
        </div>
      )}
    </>
  );
};

export default Tooltip;
