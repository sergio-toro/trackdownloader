import React from "react";

interface DateFormProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const DateForm: React.FC<DateFormProps> = ({
  selectedDate,
  setSelectedDate,
}) => {
  return (
    <div className="flex flex-col gap-2 items-center justify-center">
      <p>Select a date:</p>
      <form>
        <div className="flex flex-row gap-2">
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </form>
    </div>
  );
};

export default DateForm;
