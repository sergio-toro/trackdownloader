import React from "react";
import cx from "classnames";

type CardProps = {
  title: string;
  className?: string;
  titleActions?: React.ReactNode;
  children: React.ReactNode;
};

const Card: React.FC<CardProps> = ({
  title,
  children,
  titleActions,
  className,
}) => {
  return (
    <div
      className={cx(
        "w-auto rounded overflow-hidden shadow-md border border-slate-200 bg-cardBg",
        className
      )}
    >
      <div className="p-4">
        <div className="grid grid-cols-2 gap-1 items-center mb-2 border-b pb-2">
          <h3 className="font-bold text-xl">{title}</h3>
          {titleActions && <div className="text-right">{titleActions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
};

export default Card;
