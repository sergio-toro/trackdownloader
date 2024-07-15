import React from 'react';
import { useNavigate } from 'react-router-dom';

const ReturnButton = () => {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate('/')} className='bg-slate-200'>
      Return
    </button>
  );
};

export default ReturnButton;
