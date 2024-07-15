import React from "react";
import cx from "classnames";

type Props = {
  label: string;
  name: string;
  type?: "text" | "password";
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
  type = "text",
  value,
  autoComplete,
  name,
  placeholder,
  className,
  onChange,
}: Props) {
  return (
    <div className={cx("sm:col-span-4", className)}>
      <label htmlFor={id} className="block text-sm font-medium leading-6">
        {label}
      </label>
      <div className="mt-2">
        <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
          {/*<span className="flex select-none items-center pl-3 text-gray-500 sm:text-sm"></span>*/}
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            placeholder={placeholder || ""}
            autoComplete={autoComplete || "off"}
            onChange={onChange}
            className="block flex-1 border-0 bg-transparent py-1.5 pl-1 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
          />
        </div>
      </div>
    </div>
  );
}
