import React from "react";
import { ProgressState } from "@renderer/hooks/useScrapIGCs";
import ProgressLine from "./layout/ProgressLine";

type Props = {
  flymasterProgress: ProgressState;
  xcontestProgress: ProgressState;
  volandooProgress: ProgressState;
};

const ProgressLines: React.FC<Props> = ({
  flymasterProgress,
  xcontestProgress,
  volandooProgress,
}) => {
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
