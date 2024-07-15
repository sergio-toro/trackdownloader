import React, { useState } from 'react';

const DateForm = () => {
  return (
    <div className='flex flex-col gap-2 items-center justify-center'>
      <p>Select a date:</p>
      <form
      //   onSubmit={handleSubmit}
      >
        <div className='flex flex-row gap-2'>
          <input
            type='date'
            id='date'
            // value={specificDate}
            // onChange={(e) => setSpecificDate(e.target.value)}
          />
        </div>
      </form>
    </div>
  );
};
export default DateForm;
