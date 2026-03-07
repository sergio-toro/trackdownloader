/**
 * FormulaEditorDialog - Modal dialog for editing competition formula parameters
 * Mirrors all settings from FS Advanced Settings dialog for GAP2023/GAP2025
 */

import React, { useState, useEffect, useCallback } from "react";
import type {
  ScoringFormulaConfig,
  FormulaId,
  LeadingCalculatorType,
} from "@main/scoring/types";

interface FormulaEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formula: ScoringFormulaConfig;
  onSave: (formula: Partial<ScoringFormulaConfig>) => Promise<void>;
}

// Reusable input components
const NumberInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}> = ({ label, value, onChange, step = 1, min, max, suffix }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
      />
      {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
    </div>
  </div>
);

const Checkbox: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="rounded border-gray-300"
    />
    {label}
  </label>
);

const FormulaEditorDialog: React.FC<FormulaEditorDialogProps> = ({
  isOpen,
  onClose,
  formula,
  onSave,
}) => {
  // Competition Parameters
  const [name, setName] = useState<FormulaId>("GAP2023");
  const [nominalLaunchPct, setNominalLaunchPct] = useState(96);
  const [minimumDistanceKm, setMinimumDistanceKm] = useState(7);
  const [nominalDistanceKm, setNominalDistanceKm] = useState(70);
  const [nominalTimeMin, setNominalTimeMin] = useState(90);
  const [nominalGoalPct, setNominalGoalPct] = useState(30);
  const [scoreBackTimeMin, setScoreBackTimeMin] = useState(5);
  const [scoringAltitude, setScoringAltitude] = useState<"GPS" | "QNH">("GPS");

  // Point Types
  const [useDistancePoints, setUseDistancePoints] = useState(true);
  const [useTimePoints, setUseTimePoints] = useState(true);
  const [useDeparturePoints, setUseDeparturePoints] = useState(false);
  const [useLeadingPoints, setUseLeadingPoints] = useState(true);
  const [useArrivalPoints, setUseArrivalPoints] = useState(false);

  // Technical Parameters
  const [dayQualityOverride, setDayQualityOverride] = useState(0);
  const [jumpTheGunFactor, setJumpTheGunFactor] = useState(0);
  const [jumpTheGunMax, setJumpTheGunMax] = useState(0);
  const [leadingWeightFactor, setLeadingWeightFactor] = useState(1.0);
  const [use1000PointsForMaxDayQuality, setUse1000PointsForMaxDayQuality] =
    useState(false);
  const [normalize1000BeforeDayQuality, setNormalize1000BeforeDayQuality] =
    useState(false);
  const [useConstantLeadingWeight, setUseConstantLeadingWeight] =
    useState(true);
  const [
    useProportionalLeadingWeightIfNobodyInGoal,
    setUseProportionalLeadingWeightIfNobodyInGoal,
  ] = useState(false);
  const [timePointsIfNotInGoalPct, setTimePointsIfNotInGoalPct] = useState(0);
  const [turnpointRadiusTolerancePct, setTurnpointRadiusTolerancePct] =
    useState(0.2);
  const [turnpointRadiusMinAbsTolerance, setTurnpointRadiusMinAbsTolerance] =
    useState(5);
  const [bonusGr, setBonusGr] = useState(4);
  const [useDifficultyForDistancePoints, setUseDifficultyForDistancePoints] =
    useState(false);
  const [useLegacyLandingDetection, setUseLegacyLandingDetection] =
    useState(false);

  // Leading calculator
  const [leadingCalculatorType, setLeadingCalculatorType] =
    useState<LeadingCalculatorType>("PWC2019");
  const [useLeadingTimeRatio, setUseLeadingTimeRatio] = useState(false);
  const [leadingFractionPct, setLeadingFractionPct] = useState(16.2);
  const [arrivalFractionPct, setArrivalFractionPct] = useState(0);
  const [departureFractionPct, setDepartureFractionPct] = useState(0);

  // Time points
  const [useFlatDecline, setUseFlatDecline] = useState(true);
  const [
    redistributeRemovedTimePointsAsDistancePoints,
    setRedistributeRemovedTimePointsAsDistancePoints,
  ] = useState(true);

  // Final glide decelerator
  const [finalGlideDecelerator, setFinalGlideDecelerator] = useState<
    "none" | "cess" | "aatb"
  >("none");
  const [cessIncline, setCessIncline] = useState(0);
  const [aatbFactor, setAatbFactor] = useState(0);

  // Goal settings
  const [
    useSemiCircleControlZoneForGoalLine,
    setUseSemiCircleControlZoneForGoalLine,
  ] = useState(true);

  // Stopped task settings
  const [minTimeSpanForValidTaskMin, setMinTimeSpanForValidTaskMin] =
    useState(0);
  const [altitudeBonusFactor, setAltitudeBonusFactor] = useState(0);
  const [
    minimumValidityToCountStoppedTask,
    setMinimumValidityToCountStoppedTask,
  ] = useState(0);

  // FTV / Other
  const [ftvFactor, setFtvFactor] = useState(0);
  const [useBestScoreForFtvValidity, setUseBestScoreForFtvValidity] =
    useState(false);
  const [taskDecimals, setTaskDecimals] = useState(1);
  const [compDecimals, setCompDecimals] = useState(0);

  // Misc
  const [isPgComp, setIsPgComp] = useState(true);
  const [faiSanctioning, setFaiSanctioning] = useState(0);
  const [bonusForWholeTrack, setBonusForWholeTrack] = useState(false);
  const [optimizeSsAlone, setOptimizeSsAlone] = useState(false);
  const [useFirstPilotStartTimeForLC, setUseFirstPilotStartTimeForLC] =
    useState(false);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form from formula prop
  useEffect(() => {
    if (isOpen && formula) {
      // Competition Parameters
      setName(formula.name);
      setNominalLaunchPct(formula.nominalLaunch * 100);
      setMinimumDistanceKm(formula.minimumDistance / 1000);
      setNominalDistanceKm(formula.nominalDistance / 1000);
      setNominalTimeMin(formula.nominalTime / 60);
      setNominalGoalPct(formula.nominalGoal * 100);
      setScoreBackTimeMin(formula.scoreBackTime / 60);
      setScoringAltitude(formula.scoringAltitude === "QNH" ? "QNH" : "GPS");

      // Point Types
      setUseDistancePoints(formula.useDistancePoints);
      setUseTimePoints(formula.useTimePoints);
      setUseDeparturePoints(formula.useDeparturePoints);
      setUseLeadingPoints(formula.useLeadingPoints);
      setUseArrivalPoints(formula.useArrivalPoints);

      // Technical Parameters
      setDayQualityOverride(formula.dayQualityOverride);
      setJumpTheGunFactor(formula.jumpTheGunFactor);
      setJumpTheGunMax(formula.jumpTheGunMax);
      setLeadingWeightFactor(formula.leadingWeightFactor);
      setUse1000PointsForMaxDayQuality(formula.use1000PointsForMaxDayQuality);
      setNormalize1000BeforeDayQuality(formula.normalize1000BeforeDayQuality);
      setUseConstantLeadingWeight(formula.useConstantLeadingWeight);
      setUseProportionalLeadingWeightIfNobodyInGoal(
        formula.useProportionalLeadingWeightIfNobodyInGoal
      );
      setTimePointsIfNotInGoalPct(formula.timePointsIfNotInGoal * 100);
      setTurnpointRadiusTolerancePct(formula.turnpointRadiusTolerance * 100);
      setTurnpointRadiusMinAbsTolerance(
        formula.turnpointRadiusMinimumAbsoluteTolerance
      );
      setBonusGr(formula.bonusGr);
      setUseDifficultyForDistancePoints(formula.useDifficultyForDistancePoints);
      setUseLegacyLandingDetection(formula.useLegacyLandingDetection ?? false);

      // Leading calculator
      setLeadingCalculatorType(formula.leadingCalculatorType);
      setUseLeadingTimeRatio(formula.useLeadingTimeRatio);
      setLeadingFractionPct(formula.leadingFraction * 100);
      setArrivalFractionPct(formula.arrivalFraction * 100);
      setDepartureFractionPct(formula.departureFraction * 100);

      // Time points
      setUseFlatDecline(formula.useFlatDecline);
      setRedistributeRemovedTimePointsAsDistancePoints(
        formula.redistributeRemovedTimePointsAsDistancePoints
      );

      // Final glide decelerator
      setFinalGlideDecelerator(formula.finalGlideDecelerator);
      setCessIncline(formula.cessIncline);
      setAatbFactor(formula.aatbFactor);

      // Goal settings
      setUseSemiCircleControlZoneForGoalLine(
        formula.useSemiCircleControlZoneForGoalLine
      );

      // Stopped task settings
      setMinTimeSpanForValidTaskMin(formula.minTimeSpanForValidTask / 60);
      setAltitudeBonusFactor(formula.altitudeBonusFactor);
      setMinimumValidityToCountStoppedTask(
        formula.minimumValidityToCountStoppedTask
      );

      // FTV / Other
      setFtvFactor(formula.ftvFactor);
      setUseBestScoreForFtvValidity(formula.useBestScoreForFtvValidity);
      setTaskDecimals(formula.numberOfDecimalsTaskResults);
      setCompDecimals(formula.numberOfDecimalsCompetitionResults);

      // Misc
      setIsPgComp(formula.isPgComp);
      setFaiSanctioning(formula.faiSanctioning);
      setBonusForWholeTrack(formula.bonusForWholeTrack);
      setOptimizeSsAlone(formula.optimizeSsAlone);
      setUseFirstPilotStartTimeForLC(formula.useFirstPilotStartTimeForLC);

      setShowAdvanced(false);
    }
  }, [isOpen, formula]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        nominalLaunch: nominalLaunchPct / 100,
        minimumDistance: minimumDistanceKm * 1000,
        nominalDistance: nominalDistanceKm * 1000,
        nominalTime: nominalTimeMin * 60,
        nominalGoal: nominalGoalPct / 100,
        scoreBackTime: scoreBackTimeMin * 60,
        scoringAltitude,
        useDistancePoints,
        useTimePoints,
        useDeparturePoints,
        useLeadingPoints,
        useArrivalPoints,
        dayQualityOverride,
        jumpTheGunFactor,
        jumpTheGunMax,
        leadingWeightFactor,
        use1000PointsForMaxDayQuality,
        normalize1000BeforeDayQuality,
        useConstantLeadingWeight,
        useProportionalLeadingWeightIfNobodyInGoal,
        timePointsIfNotInGoal: timePointsIfNotInGoalPct / 100,
        turnpointRadiusTolerance: turnpointRadiusTolerancePct / 100,
        turnpointRadiusMinimumAbsoluteTolerance: turnpointRadiusMinAbsTolerance,
        bonusGr,
        useDifficultyForDistancePoints,
        useLegacyLandingDetection,
        leadingCalculatorType,
        useLeadingTimeRatio,
        leadingFraction: leadingFractionPct / 100,
        arrivalFraction: arrivalFractionPct / 100,
        departureFraction: departureFractionPct / 100,
        useFlatDecline,
        redistributeRemovedTimePointsAsDistancePoints,
        finalGlideDecelerator,
        cessIncline,
        aatbFactor,
        useSemiCircleControlZoneForGoalLine,
        minTimeSpanForValidTask: minTimeSpanForValidTaskMin * 60,
        altitudeBonusFactor,
        minimumValidityToCountStoppedTask,
        useBestScoreForFtvValidity,
        isPgComp,
        faiSanctioning,
        bonusForWholeTrack,
        optimizeSsAlone,
        useFirstPilotStartTimeForLC,
        ftvFactor,
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
    nominalLaunchPct,
    minimumDistanceKm,
    nominalDistanceKm,
    nominalTimeMin,
    nominalGoalPct,
    scoreBackTimeMin,
    scoringAltitude,
    useDistancePoints,
    useTimePoints,
    useDeparturePoints,
    useLeadingPoints,
    useArrivalPoints,
    dayQualityOverride,
    jumpTheGunFactor,
    jumpTheGunMax,
    leadingWeightFactor,
    use1000PointsForMaxDayQuality,
    normalize1000BeforeDayQuality,
    useConstantLeadingWeight,
    useProportionalLeadingWeightIfNobodyInGoal,
    timePointsIfNotInGoalPct,
    turnpointRadiusTolerancePct,
    turnpointRadiusMinAbsTolerance,
    bonusGr,
    useDifficultyForDistancePoints,
    useLegacyLandingDetection,
    leadingCalculatorType,
    useLeadingTimeRatio,
    leadingFractionPct,
    arrivalFractionPct,
    departureFractionPct,
    useFlatDecline,
    redistributeRemovedTimePointsAsDistancePoints,
    finalGlideDecelerator,
    cessIncline,
    aatbFactor,
    useSemiCircleControlZoneForGoalLine,
    minTimeSpanForValidTaskMin,
    altitudeBonusFactor,
    minimumValidityToCountStoppedTask,
    useBestScoreForFtvValidity,
    isPgComp,
    faiSanctioning,
    bonusForWholeTrack,
    optimizeSsAlone,
    useFirstPilotStartTimeForLC,
    ftvFactor,
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
            {/* Competition Parameters */}
            <section>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Competition Parameters
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

                <NumberInput
                  label="Nominal Launch"
                  value={nominalLaunchPct}
                  onChange={setNominalLaunchPct}
                  min={0}
                  max={100}
                  suffix="% of pilots"
                />
                <NumberInput
                  label="Minimum Distance"
                  value={minimumDistanceKm}
                  onChange={setMinimumDistanceKm}
                  step={0.5}
                  min={0}
                  suffix="km"
                />
                <NumberInput
                  label="Nominal Distance"
                  value={nominalDistanceKm}
                  onChange={setNominalDistanceKm}
                  min={0}
                  suffix="km"
                />
                <NumberInput
                  label="Nominal Time"
                  value={nominalTimeMin}
                  onChange={setNominalTimeMin}
                  step={5}
                  min={0}
                  suffix="min"
                />
                <NumberInput
                  label="Nominal Goal"
                  value={nominalGoalPct}
                  onChange={setNominalGoalPct}
                  min={0}
                  max={100}
                  suffix="% of pilots"
                />
                <NumberInput
                  label="Score-back Time"
                  value={scoreBackTimeMin}
                  onChange={setScoreBackTimeMin}
                  min={0}
                  suffix="min"
                />

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scoring Altitude
                  </label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="scoringAltitude"
                        checked={scoringAltitude === "QNH"}
                        onChange={() => setScoringAltitude("QNH")}
                      />
                      QNH
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="scoringAltitude"
                        checked={scoringAltitude === "GPS"}
                        onChange={() => setScoringAltitude("GPS")}
                      />
                      GPS
                    </label>
                  </div>
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
                <div className="mt-4 space-y-6">
                  {/* Point Types & Fractions */}
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Point Types
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      <Checkbox
                        label="Use Distance Points"
                        checked={useDistancePoints}
                        onChange={setUseDistancePoints}
                      />
                      <Checkbox
                        label="Use Departure Points"
                        checked={useDeparturePoints}
                        onChange={setUseDeparturePoints}
                      />
                      <Checkbox
                        label="Use Time Points"
                        checked={useTimePoints}
                        onChange={setUseTimePoints}
                      />
                      <Checkbox
                        label="Use Leading Points"
                        checked={useLeadingPoints}
                        onChange={setUseLeadingPoints}
                      />
                      <Checkbox
                        label="Use Arrival Position Points"
                        checked={useArrivalPoints}
                        onChange={setUseArrivalPoints}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <NumberInput
                        label="Leading Fraction"
                        value={leadingFractionPct}
                        onChange={setLeadingFractionPct}
                        step={0.1}
                        min={0}
                        max={100}
                        suffix="%"
                      />
                      <NumberInput
                        label="Arrival Fraction"
                        value={arrivalFractionPct}
                        onChange={setArrivalFractionPct}
                        step={0.1}
                        min={0}
                        max={100}
                        suffix="%"
                      />
                      <NumberInput
                        label="Departure Fraction"
                        value={departureFractionPct}
                        onChange={setDepartureFractionPct}
                        step={0.1}
                        min={0}
                        max={100}
                        suffix="%"
                      />
                    </div>
                  </div>

                  {/* Leading Coefficient */}
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Leading Coefficient
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          LC Calculator
                        </label>
                        <select
                          value={leadingCalculatorType}
                          onChange={(e) =>
                            setLeadingCalculatorType(
                              e.target.value as LeadingCalculatorType
                            )
                          }
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                        >
                          <option value="PWC2019">PWC2019</option>
                          <option value="PWC2023">PWC2023</option>
                          <option value="Classic">Classic</option>
                        </select>
                      </div>
                      <NumberInput
                        label="Leading Weight Factor"
                        value={leadingWeightFactor}
                        onChange={setLeadingWeightFactor}
                        step={0.1}
                        min={0}
                        max={2}
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Checkbox
                        label="Use leading time ratio"
                        checked={useLeadingTimeRatio}
                        onChange={setUseLeadingTimeRatio}
                      />
                      <Checkbox
                        label="Use constant leading weight"
                        checked={useConstantLeadingWeight}
                        onChange={setUseConstantLeadingWeight}
                      />
                      <Checkbox
                        label="Proportional leading weight if no pilot in goal"
                        checked={useProportionalLeadingWeightIfNobodyInGoal}
                        onChange={setUseProportionalLeadingWeightIfNobodyInGoal}
                      />
                      <Checkbox
                        label="Use first pilot start time for LC"
                        checked={useFirstPilotStartTimeForLC}
                        onChange={setUseFirstPilotStartTimeForLC}
                      />
                    </div>
                  </div>

                  {/* Time & Distance Points */}
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Time & Distance Points
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="Time Points if ES but not Goal"
                        value={timePointsIfNotInGoalPct}
                        onChange={setTimePointsIfNotInGoalPct}
                        min={0}
                        max={100}
                        suffix="%"
                      />
                      <div />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Checkbox
                        label="Use flat decline (5/6 exponent)"
                        checked={useFlatDecline}
                        onChange={setUseFlatDecline}
                      />
                      <Checkbox
                        label="Redistribute removed time points as distance points"
                        checked={redistributeRemovedTimePointsAsDistancePoints}
                        onChange={
                          setRedistributeRemovedTimePointsAsDistancePoints
                        }
                      />
                      <Checkbox
                        label='Use "difficulty" for distance points calculation'
                        checked={useDifficultyForDistancePoints}
                        onChange={setUseDifficultyForDistancePoints}
                      />
                    </div>
                  </div>

                  {/* Technical Parameters */}
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Technical Parameters
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="Day Quality Override"
                        value={dayQualityOverride}
                        onChange={setDayQualityOverride}
                        step={0.01}
                        min={0}
                        max={1}
                      />
                      <NumberInput
                        label="Turnpoint Radius Tolerance"
                        value={turnpointRadiusTolerancePct}
                        onChange={setTurnpointRadiusTolerancePct}
                        step={0.01}
                        min={0}
                        suffix="%"
                      />
                      <NumberInput
                        label={'"Jump the Gun" Factor'}
                        value={jumpTheGunFactor}
                        onChange={setJumpTheGunFactor}
                        min={0}
                      />
                      <NumberInput
                        label="TP Radius Min Abs Tolerance"
                        value={turnpointRadiusMinAbsTolerance}
                        onChange={setTurnpointRadiusMinAbsTolerance}
                        min={0}
                        suffix="m"
                      />
                      <NumberInput
                        label={'Max "Jump the Gun" (seconds)'}
                        value={jumpTheGunMax}
                        onChange={setJumpTheGunMax}
                        step={10}
                        min={0}
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Checkbox
                        label="1000 points for winner if no pilot in goal"
                        checked={use1000PointsForMaxDayQuality}
                        onChange={setUse1000PointsForMaxDayQuality}
                      />
                      <Checkbox
                        label="1000 points for winner before DQ is applied"
                        checked={normalize1000BeforeDayQuality}
                        onChange={setNormalize1000BeforeDayQuality}
                      />
                      <Checkbox
                        label="Use legacy landing detection (4-min avg speed)"
                        checked={useLegacyLandingDetection}
                        onChange={setUseLegacyLandingDetection}
                      />
                    </div>
                  </div>

                  {/* Goal & Final Glide */}
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Goal & Final Glide
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Final Glide Decelerator
                        </label>
                        <select
                          value={finalGlideDecelerator}
                          onChange={(e) =>
                            setFinalGlideDecelerator(
                              e.target.value as "none" | "cess" | "aatb"
                            )
                          }
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                        >
                          <option value="none">None</option>
                          <option value="cess">CESS</option>
                          <option value="aatb">AATB</option>
                        </select>
                      </div>
                      <div />
                      <NumberInput
                        label="CESS Incline"
                        value={cessIncline}
                        onChange={setCessIncline}
                        step={0.5}
                        min={0}
                        suffix="°"
                      />
                      <NumberInput
                        label="AATB Factor"
                        value={aatbFactor}
                        onChange={setAatbFactor}
                        step={0.05}
                        min={0}
                        max={1}
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Checkbox
                        label="Use semi-circle control zone for goal line"
                        checked={useSemiCircleControlZoneForGoalLine}
                        onChange={setUseSemiCircleControlZoneForGoalLine}
                      />
                    </div>
                  </div>

                  {/* Stopped Task */}
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Stopped Task
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="Stopped Task Bonus Glide Ratio"
                        value={bonusGr}
                        onChange={setBonusGr}
                        min={0}
                        suffix=":1"
                      />
                      <NumberInput
                        label="Min Time Span for Valid Task"
                        value={minTimeSpanForValidTaskMin}
                        onChange={setMinTimeSpanForValidTaskMin}
                        step={5}
                        min={0}
                        suffix="min"
                      />
                      <NumberInput
                        label="Altitude Bonus Factor"
                        value={altitudeBonusFactor}
                        onChange={setAltitudeBonusFactor}
                        step={0.01}
                        min={0}
                        max={0.1}
                      />
                      <NumberInput
                        label="Min Validity for Stopped Task"
                        value={minimumValidityToCountStoppedTask}
                        onChange={setMinimumValidityToCountStoppedTask}
                        step={0.01}
                        min={0}
                        max={1}
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Checkbox
                        label="Use bonus for whole track"
                        checked={bonusForWholeTrack}
                        onChange={setBonusForWholeTrack}
                      />
                    </div>
                  </div>

                  {/* Other Settings */}
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Other Settings
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        label="FTV Factor"
                        value={ftvFactor}
                        onChange={setFtvFactor}
                        step={0.1}
                        min={0}
                        max={1}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          FAI Sanctioning
                        </label>
                        <select
                          value={faiSanctioning}
                          onChange={(e) =>
                            setFaiSanctioning(parseInt(e.target.value, 10))
                          }
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                        >
                          <option value={0}>None</option>
                          <option value={1}>Category 2</option>
                          <option value={2}>Category 1</option>
                        </select>
                      </div>
                      <NumberInput
                        label="Decimals (Task)"
                        value={taskDecimals}
                        onChange={(v) => setTaskDecimals(Math.round(v))}
                        min={0}
                        max={4}
                      />
                      <NumberInput
                        label="Decimals (Competition)"
                        value={compDecimals}
                        onChange={(v) => setCompDecimals(Math.round(v))}
                        min={0}
                        max={4}
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Checkbox
                        label="Use best score for FTV validity"
                        checked={useBestScoreForFtvValidity}
                        onChange={setUseBestScoreForFtvValidity}
                      />
                      <Checkbox
                        label="Paragliding competition"
                        checked={isPgComp}
                        onChange={setIsPgComp}
                      />
                      <Checkbox
                        label="Optimize SS alone"
                        checked={optimizeSsAlone}
                        onChange={setOptimizeSsAlone}
                      />
                    </div>
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
