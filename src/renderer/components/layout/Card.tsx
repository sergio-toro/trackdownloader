import React from "react";
import cx from "classnames";

type CardProps = {
  title: string;
  className?: string;
  children: React.ReactNode;
};

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div
      className={cx("max-w-sm rounded overflow-hidden shadow-lg", className)}
    >
      <div className="px-6 py-4">
        <div className="font-bold text-xl mb-2">{title}</div>
        {children}
      </div>
    </div>
  );
};

export default Card;
