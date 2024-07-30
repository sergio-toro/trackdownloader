import React from "react";
import useFetchIGCs from "@renderer/hooks/useScrapIGCs";
import ProgressLine from "./layout/ProgressLine";

const ProgressLines: React.FC = () => {
  const { flymasterProgress, xcontestProgress, volandooProgress } =
    useFetchIGCs();

  return (
    <>
      {flymasterProgress.visible && (
        <ProgressLine
          detail={flymasterProgress.detail}
          percent={flymasterProgress.percent}
        />
      )}
      {xcontestProgress.visible && (
        <ProgressLine
          detail={xcontestProgress.detail}
          percent={xcontestProgress.percent}
        />
      )}
      {volandooProgress.visible && (
        <ProgressLine
          detail={volandooProgress.detail}
          percent={volandooProgress.percent}
        />
      )}
    </>
  );
};

export default ProgressLines;
