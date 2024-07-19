import React from "react";
import cx from "classnames";

type Props = {
  label: string;
  name: string;
  mode?: "inline" | "vertical";
  type?: "text" | "password" | "date";
  placeholder?: string;
  autoComplete?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  id: string;
};
export default function Input({
  id,
  label,
  mode = "vertical",
  type = "text",
  value,
  autoComplete,
  name,
  placeholder,
  className,
  onChange,
}: Props) {
  return (
    <div
      className={cx(
        "sm:col-span-4",
        { "flex gap-2 items-center": mode === "inline" },
        className
      )}
    >
      <label htmlFor={id} className="block text-sm font-medium leading-6">
        {label}
      </label>
      <div className={cx({ "mt-2": mode === "vertical" })}>
        <div className="flex rounded-md border border-gray-300 shadow-sm ring-inset focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
          {/*<span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm"></span>*/}
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            placeholder={placeholder || ""}
            autoComplete={autoComplete || "off"}
            onChange={onChange}
            className="block flex-1 border-0 py-1.5 pl-1  focus:ring-0 sm:text-sm sm:leading-6 text-inputText"
          />
        </div>
      </div>
    </div>
  );
}
