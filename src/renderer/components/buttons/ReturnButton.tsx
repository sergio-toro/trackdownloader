import React from "react";
import { useNavigate } from "react-router-dom";

const ReturnButton = () => {
  const navigate = useNavigate();

  return <button onClick={() => navigate("/")}>Return</button>;
};

export default ReturnButton;
