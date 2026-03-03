/**
 * FormulaEditorDialog - Modal dialog for editing competition formula parameters
 */

import React, { useState, useEffect, useCallback } from "react";
import type { ScoringFormulaConfig, FormulaId } from "@main/scoring/types";

interface FormulaEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formula: ScoringFormulaConfig;
  onSave: (formula: Partial<ScoringFormulaConfig>) => Promise<void>;
}

const FormulaEditorDialog: React.FC<FormulaEditorDialogProps> = ({
  isOpen,
  onClose,
  formula,
  onSave,
}) => {
  // Main parameters
  const [name, setName] = useState<FormulaId>("GAP2023");
  const [nominalDistanceKm, setNominalDistanceKm] = useState(50);
  const [minimumDistanceKm, setMinimumDistanceKm] = useState(7);
  const [nominalTimeMin, setNominalTimeMin] = useState(90);
  const [nominalGoalPct, setNominalGoalPct] = useState(20);
  const [nominalLaunchPct, setNominalLaunchPct] = useState(96);

  // Scoring options
  const [leadingWeightFactor, setLeadingWeightFactor] = useState(1.0);
  const [scoreBackTimeMin, setScoreBackTimeMin] = useState(5);
  const [scoringAltitude, setScoringAltitude] = useState<"GPS" | "QNH">("GPS");
  const [useFlatDecline, setUseFlatDecline] = useState(true);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ftvFactor, setFtvFactor] = useState(0);
  const [turnpointRadiusTolerance, setTurnpointRadiusTolerance] =
    useState(0.005);
  const [turnpointRadiusMinAbsTolerance, setTurnpointRadiusMinAbsTolerance] =
    useState(5);
  const [bonusGr, setBonusGr] = useState(0);
  const [jumpTheGunFactor, setJumpTheGunFactor] = useState(1);
  const [jumpTheGunMax, setJumpTheGunMax] = useState(300);
  const [taskDecimals, setTaskDecimals] = useState(1);
  const [compDecimals, setCompDecimals] = useState(0);

  // UI state
  const [isSaving, setIsSaving] = useState(false);

  // Populate form from formula prop
  useEffect(() => {
    if (isOpen && formula) {
      setName(formula.name);
      setNominalDistanceKm(formula.nominalDistance / 1000);
      setMinimumDistanceKm(formula.minimumDistance / 1000);
      setNominalTimeMin(formula.nominalTime / 60);
      setNominalGoalPct(formula.nominalGoal * 100);
      setNominalLaunchPct(formula.nominalLaunch * 100);
      setLeadingWeightFactor(formula.leadingWeightFactor);
      setScoreBackTimeMin(formula.scoreBackTime / 60);
      setScoringAltitude(formula.scoringAltitude === "QNH" ? "QNH" : "GPS");
      setUseFlatDecline(formula.useFlatDecline);
      setFtvFactor(formula.ftvFactor);
      setTurnpointRadiusTolerance(formula.turnpointRadiusTolerance);
      setTurnpointRadiusMinAbsTolerance(
        formula.turnpointRadiusMinimumAbsoluteTolerance
      );
      setBonusGr(formula.bonusGr);
      setJumpTheGunFactor(formula.jumpTheGunFactor);
      setJumpTheGunMax(formula.jumpTheGunMax);
      setTaskDecimals(formula.numberOfDecimalsTaskResults);
      setCompDecimals(formula.numberOfDecimalsCompetitionResults);
      setShowAdvanced(false);
    }
  }, [isOpen, formula]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        nominalDistance: nominalDistanceKm * 1000,
        minimumDistance: minimumDistanceKm * 1000,
        nominalTime: nominalTimeMin * 60,
        nominalGoal: nominalGoalPct / 100,
        nominalLaunch: nominalLaunchPct / 100,
        leadingWeightFactor,
        scoreBackTime: scoreBackTimeMin * 60,
        scoringAltitude,
        useFlatDecline,
        ftvFactor,
        turnpointRadiusTolerance,
        turnpointRadiusMinimumAbsoluteTolerance: turnpointRadiusMinAbsTolerance,
        bonusGr,
        jumpTheGunFactor,
        jumpTheGunMax,
        numberOfDecimalsTaskResults: taskDecimals,
        numberOfDecimalsCompetitionResults: compDecimals,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save formula:", err);
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    nominalDistanceKm,
    minimumDistanceKm,
    nominalTimeMin,
    nominalGoalPct,
    nominalLaunchPct,
    leadingWeightFactor,
    scoreBackTimeMin,
    scoringAltitude,
    useFlatDecline,
    ftvFactor,
    turnpointRadiusTolerance,
    turnpointRadiusMinAbsTolerance,
    bonusGr,
    jumpTheGunFactor,
    jumpTheGunMax,
    taskDecimals,
    compDecimals,
    onSave,
    onClose,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold">Formula Parameters</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Main Parameters */}
            <section>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Main Parameters
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formula
                  </label>
                  <select
                    value={name}
                    onChange={(e) => setName(e.target.value as FormulaId)}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  >
                    <option value="GAP2023">GAP2023</option>
                    <option value="GAP2025">GAP2025</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nominal Distance (km)
                  </label>
                  <input
                    type="number"
                    value={nominalDistanceKm}
                    onChange={(e) =>
                      setNominalDistanceKm(parseFloat(e.target.value) || 0)
                    }
                    step={1}
                    min={0}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Distance (km)
                  </label>
                  <input
                    type="number"
                    value={minimumDistanceKm}
                    onChange={(e) =>
                      setMinimumDistanceKm(parseFloat(e.target.value) || 0)
                    }
                    step={0.5}
                    min={0}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nominal Time (min)
                  </label>
                  <input
                    type="number"
                    value={nominalTimeMin}
                    onChange={(e) =>
                      setNominalTimeMin(parseFloat(e.target.value) || 0)
                    }
                    step={5}
                    min={0}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nominal Goal (%)
                  </label>
                  <input
                    type="number"
                    value={nominalGoalPct}
                    onChange={(e) =>
                      setNominalGoalPct(parseFloat(e.target.value) || 0)
                    }
                    step={1}
                    min={0}
                    max={100}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nominal Launch (%)
                  </label>
                  <input
                    type="number"
                    value={nominalLaunchPct}
                    onChange={(e) =>
                      setNominalLaunchPct(parseFloat(e.target.value) || 0)
                    }
                    step={1}
                    min={0}
                    max={100}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Scoring Options */}
            <section>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Scoring Options
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leading Weight Factor
                  </label>
                  <input
                    type="number"
                    value={leadingWeightFactor}
                    onChange={(e) =>
                      setLeadingWeightFactor(parseFloat(e.target.value) || 0)
                    }
                    step={0.1}
                    min={0}
                    max={2}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Score Back Time (min)
                  </label>
                  <input
                    type="number"
                    value={scoreBackTimeMin}
                    onChange={(e) =>
                      setScoreBackTimeMin(parseFloat(e.target.value) || 0)
                    }
                    step={1}
                    min={0}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scoring Altitude
                  </label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="scoringAltitude"
                        checked={scoringAltitude === "GPS"}
                        onChange={() => setScoringAltitude("GPS")}
                      />
                      GPS
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="scoringAltitude"
                        checked={scoringAltitude === "QNH"}
                        onChange={() => setScoringAltitude("QNH")}
                      />
                      QNH
                    </label>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mt-4">
                    <input
                      type="checkbox"
                      checked={useFlatDecline}
                      onChange={(e) => setUseFlatDecline(e.target.checked)}
                    />
                    Use Flat Decline (5/6)
                  </label>
                </div>
              </div>
            </section>

            {/* Advanced Settings */}
            <section>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-sm font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      FTV Factor
                    </label>
                    <input
                      type="number"
                      value={ftvFactor}
                      onChange={(e) =>
                        setFtvFactor(parseFloat(e.target.value) || 0)
                      }
                      step={0.1}
                      min={0}
                      max={1}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bonus Glide Ratio
                    </label>
                    <input
                      type="number"
                      value={bonusGr}
                      onChange={(e) =>
                        setBonusGr(parseFloat(e.target.value) || 0)
                      }
                      step={1}
                      min={0}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TP Radius Tolerance
                    </label>
                    <input
                      type="number"
                      value={turnpointRadiusTolerance}
                      onChange={(e) =>
                        setTurnpointRadiusTolerance(
                          parseFloat(e.target.value) || 0
                        )
                      }
                      step={0.001}
                      min={0}
                      max={0.1}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Abs Tolerance (m)
                    </label>
                    <input
                      type="number"
                      value={turnpointRadiusMinAbsTolerance}
                      onChange={(e) =>
                        setTurnpointRadiusMinAbsTolerance(
                          parseFloat(e.target.value) || 0
                        )
                      }
                      step={1}
                      min={0}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jump the Gun Factor
                    </label>
                    <input
                      type="number"
                      value={jumpTheGunFactor}
                      onChange={(e) =>
                        setJumpTheGunFactor(parseFloat(e.target.value) || 0)
                      }
                      step={0.1}
                      min={0}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jump the Gun Max
                    </label>
                    <input
                      type="number"
                      value={jumpTheGunMax}
                      onChange={(e) =>
                        setJumpTheGunMax(parseFloat(e.target.value) || 0)
                      }
                      step={10}
                      min={0}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Decimals (Task)
                    </label>
                    <input
                      type="number"
                      value={taskDecimals}
                      onChange={(e) =>
                        setTaskDecimals(parseInt(e.target.value) || 0)
                      }
                      step={1}
                      min={0}
                      max={4}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Decimals (Comp)
                    </label>
                    <input
                      type="number"
                      value={compDecimals}
                      onChange={(e) =>
                        setCompDecimals(parseInt(e.target.value) || 0)
                      }
                      step={1}
                      min={0}
                      max={4}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulaEditorDialog;
