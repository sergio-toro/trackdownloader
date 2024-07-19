import React from "react";
import Input from "@components/forms/Input";

interface DateFormProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const DateForm: React.FC<DateFormProps> = ({
  selectedDate,
  setSelectedDate,
}) => {
  return (
    <Input
      mode="inline"
      type="date"
      label="Select a date"
      id="date"
      name="date"
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
    />
  );
};

export default DateForm;
