import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useCostModel } from "../../context/CostModelContext";
import { useAppMode } from "../../context/AppModeContext";
import { useBuildTarget } from "../../context/BuildTargetContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Box,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  X,
  List,
  Settings,
  AlertCircle,
  Zap,
  BarChart2,
  Package,
  ChevronRight,
  LayoutDashboard,
  CalendarDays,
  Hammer,
} from "lucide-react";

// ─── Pipeline step definitions ───────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    id: 0,
    label: "Parse BOM",
    shortLabel: "Parse BOM",
    icon: List,
    description: "Reading bill of materials structure and part hierarchy",
    detail: "Parsing assembly tree, extracting part numbers, quantities, and material flags",
  },
  {
    id: 1,
    label: "Extract Drawing Data",
    shortLabel: "Extract Drawings",
    icon: FileText,
    description: "Processing PDF engineering drawings for dimensional and annotation data",
    detail: "Extracting tolerances, surface finishes, GD&T annotations, and title block data",
  },
  {
    id: 2,
    label: "Analyze STEP Geometry",
    shortLabel: "Analyze Geometry",
    icon: Box,
    description: "Parsing STEP file 3D geometry for feature recognition",
    detail: "Identifying machined features, casting geometry, hole patterns, and complex surfaces",
  },
  {
    id: 3,
    label: "Infer Manufacturing Processes",
    shortLabel: "Infer Processes",
    icon: Settings,
    description: "Inferring manufacturing processes from geometry and drawing data",
    detail: "Mapping geometry features to candidate processes — machining, casting, stamping, additive",
  },
  {
    id: 4,
    label: "Identify Cost Drivers",
    shortLabel: "Identify Drivers",
    icon: AlertCircle,
    description: "Identifying primary cost drivers across the assembly",
    detail: "Scoring parts by complexity, material cost, process cost, and tolerance burden",
  },
  {
    id: 5,
    label: "Generate Cost Interventions",
    shortLabel: "Generate Interventions",
    icon: Zap,
    description: "Generating cost reduction intervention candidates",
    detail: "Applying DFM rules, material substitution logic, and process transition heuristics",
  },
  {
    id: 6,
    label: "Rank Interventions",
    shortLabel: "Rank Interventions",
    icon: BarChart2,
    description: "Ranking interventions by impact and implementation feasibility",
    detail: "Scoring each intervention on savings potential, risk, and engineering effort",
  },
];

const FILE_TYPES = [
  { label: "3D Files", ext: ".step / .stp", icon: Box, color: "#1B3A5C", bg: "#EFF4FA" },
  { label: "Technical Drawings", ext: ".dxf / .pdf", icon: FileText, color: "#7C3AED", bg: "#F5F3FF" },
  { label: "BOM Spreadsheet", ext: ".xlsx / .csv", icon: FileSpreadsheet, color: "#059669", bg: "#F0FDF4" },
];

type Stage = "idle" | "uploading" | "processing" | "complete";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepNode({
  step,
  status,
  isLast,
  isCurrent,
}: {
  step: (typeof PIPELINE_STEPS)[0];
  status: "pending" | "active" | "complete";
  isLast: boolean;
  isCurrent: boolean;
}) {
  const Icon = step.icon;
  return (
    <div className="flex items-center flex-1 min-w-0">
      <div className="flex flex-col items-center gap-1.5 min-w-0" style={{ width: 80 }}>
        {/* Node circle */}
        <div className="relative">
          {status === "active" && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: "#3B82F6", opacity: 0.2 }}
              animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 relative z-10"
            style={{
              borderColor:
                status === "complete"
                  ? "#10B981"
                  : status === "active"
                  ? "#3B82F6"
                  : "#CBD5E1",
              background:
                status === "complete"
                  ? "#ECFDF5"
                  : status === "active"
                  ? "#EFF6FF"
                  : "#F8FAFC",
            }}
          >
            {status === "complete" ? (
              <CheckCircle2 size={16} color="#10B981" />
            ) : status === "active" ? (
              <Loader2 size={15} color="#3B82F6" className="animate-spin" />
            ) : (
              <Icon size={14} color="#CBD5E1" />
            )}
          </div>
        </div>

        {/* Label */}
        <p
          className="text-center leading-tight"
          style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 10,
            fontWeight: status === "active" ? 600 : status === "complete" ? 500 : 400,
            color:
              status === "complete"
                ? "#059669"
                : status === "active"
                ? "#1D4ED8"
                : "#94A3B8",
            width: 72,
          }}
        >
          {step.shortLabel}
        </p>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div className="flex-1 h-0.5 mb-5 mx-1 relative overflow-hidden rounded-full" style={{ background: "#E2E8F0", minWidth: 12 }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: "#10B981" }}
            animate={{ width: status === "complete" ? "100%" : "0%" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UploadAnalysis() {
  const navigate = useNavigate();
  const { expectedAnnualVolume, setExpectedAnnualVolume } = useCostModel();
  const { mode } = useAppMode();
  const { buildTargetDate, estimatedBuildDays, setBuildTargetDate, setEstimatedBuildDays, buildQuantity, setBuildQuantity } = useBuildTarget();
  const [buildDaysInput, setBuildDaysInput] = useState(String(estimatedBuildDays));
  const [buildQtyInput, setBuildQtyInput] = useState(String(buildQuantity));
  const [stage, setStage] = useState<Stage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [log, setLog] = useState<{ step: number; msg: string }[]>([]);
  const [volumeInput, setVolumeInput] = useState(String(expectedAnnualVolume));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  // Run pipeline simulation
  const runPipeline = useCallback((name: string) => {
    setFileName(name);
    setStage("uploading");

    // Brief "uploading" then start processing
    setTimeout(() => {
      setStage("processing");
      setCurrentStep(0);

      PIPELINE_STEPS.forEach((step, i) => {
        const startDelay = 400 + i * 1600;
        const completeDelay = startDelay + 1200;

        setTimeout(() => {
          setCurrentStep(i);
          setLog((prev) => [
            ...prev,
            { step: i, msg: step.description + "..." },
          ]);
        }, startDelay);

        setTimeout(() => {
          setCompletedSteps((prev) => [...prev, i]);
          setLog((prev) => [
            ...prev,
            { step: i, msg: `✓ ${step.shortLabel} complete` },
          ]);
          if (i === PIPELINE_STEPS.length - 1) {
            setTimeout(() => {
              setStage("complete");
              setCurrentStep(-1);
            }, 600);
          }
        }, completeDelay);
      });
    }, 900);
  }, []);

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) runPipeline(file.name);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runPipeline(file.name);
  };

  const handleReset = () => {
    setStage("idle");
    setFileName(null);
    setCurrentStep(-1);
    setCompletedSteps([]);
    setLog([]);
  };

  // ── Stage: idle/upload ──────────────────────────────────────────────────────
  const renderUpload = () => (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-8">
      <div className="w-full max-w-2xl">
        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200"
          style={{
            borderColor: isDragging ? "#3B82F6" : "#CBD5E1",
            background: isDragging ? "#EFF6FF" : "#FAFBFD",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Icon */}
          <motion.div
            animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: isDragging ? "#DBEAFE" : "#EFF4FA" }}
          >
            <FileArchive size={30} color={isDragging ? "#3B82F6" : "#1B3A5C"} />
          </motion.div>

          {/* Text */}
          <div className="text-center">
            <p
              className="text-[#1E293B] mb-1"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 16 }}
            >
              {isDragging ? "Drop your ZIP file here" : "Upload your assembly package"}
            </p>
            <p className="text-[13px] text-[#64748B]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Drag & drop a ZIP file, or{" "}
              <span className="text-[#2563EB]" style={{ fontWeight: 500 }}>browse your files</span>
            </p>
          </div>

          {/* ZIP badge */}
          <div
            className="px-3 py-1.5 rounded-lg text-[12px]"
            style={{ background: "#F1F5F9", color: "#64748B", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
          >
            Accepts .zip files only
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="mt-5 rounded-xl border border-[#E2E8F0] bg-white p-5"
        >
          <p
            className="text-[12px] text-[#64748B] uppercase tracking-wider mb-4"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
          >
            Your ZIP must contain
          </p>
          <div className="grid grid-cols-3 gap-3">
            {FILE_TYPES.map((ft) => {
              const Icon = ft.icon;
              return (
                <div
                  key={ft.label}
                  className="rounded-xl border border-[#E2E8F0] p-4 flex flex-col gap-2"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: ft.bg }}
                  >
                    <Icon size={17} color={ft.color} />
                  </div>
                  <div>
                    <p
                      className="text-[13px] text-[#1E293B]"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
                    >
                      {ft.label}
                    </p>
                    <p
                      className="text-[11px] text-[#94A3B8] mt-0.5"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {ft.ext}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Project Settings */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings size={13} color="#94A3B8" />
            <p
              className="text-[12px] text-[#64748B] uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
            >
              Project Settings
            </p>
          </div>
          {mode === "prototype" ? (
            <p className="text-[12px] text-[#94A3B8]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Annual volume is not applicable in prototype mode. Set build quantity in Prototype Build Settings below.
            </p>
          ) : (
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-[220px]">
                <label
                  className="block text-[11px] text-[#64748B] mb-1.5"
                  style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  Expected Annual Volume
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[12px] select-none"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    ×
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={500}
                    value={volumeInput}
                    onChange={(e) => {
                      setVolumeInput(e.target.value);
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) setExpectedAnnualVolume(v);
                    }}
                    onBlur={() => setVolumeInput(String(expectedAnnualVolume))}
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD] focus:bg-white transition-colors"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  Used to project annual savings across cost interventions
                </p>
              </div>
              <div className="pb-0.5">
                <div
                  className="px-3 py-2 rounded-lg border border-[#E2E8F0] text-[12px] text-[#64748B]"
                  style={{ background: "#F8FAFC", fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  <span className="text-[#94A3B8]">Active:</span>{" "}
                  <span style={{ fontWeight: 600, color: "#1B3A5C" }}>
                    {expectedAnnualVolume.toLocaleString()} units/yr
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Prototype Build Settings */}
        {mode === "prototype" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.24 }}
            className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-5"
            style={{ borderColor: "#E0E7EF" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={13} color="#2563EB" />
              <p
                className="text-[12px] text-[#2563EB] uppercase tracking-wider"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
              >
                Prototype Build Settings
              </p>
              <span
                className="ml-auto text-[10px] px-2 py-0.5 rounded-full border"
                style={{ background: "#EFF6FF", color: "#2563EB", borderColor: "#BFDBFE", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
              >
                Prototype mode
              </span>
            </div>
            <div className="flex items-end gap-4 flex-wrap">
              {/* Next Build Target Date */}
              <div className="flex-1" style={{ minWidth: 180 }}>
                <label
                  className="block text-[11px] text-[#64748B] mb-1.5"
                  style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  Next Build Target Date
                </label>
                <input
                  type="date"
                  value={buildTargetDate}
                  onChange={(e) => setBuildTargetDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD] focus:bg-white transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="text-[11px] text-[#94A3B8] mt-1.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  Drives order-by deadlines and overdue flags across all views
                </p>
              </div>
              {/* Build Quantity */}
              <div style={{ width: 140 }}>
                <label
                  className="block text-[11px] text-[#64748B] mb-1.5"
                  style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  Build Quantity
                </label>
                <div className="relative">
                  <Package size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={buildQtyInput}
                    onChange={(e) => {
                      setBuildQtyInput(e.target.value);
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) setBuildQuantity(v);
                    }}
                    onBlur={() => setBuildQtyInput(String(buildQuantity))}
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD] focus:bg-white transition-colors"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  units
                </p>
              </div>
              {/* Estimated Build Days */}
              <div style={{ width: 140 }}>
                <label
                  className="block text-[11px] text-[#64748B] mb-1.5"
                  style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  Est. Build Duration
                </label>
                <div className="relative">
                  <Hammer size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={buildDaysInput}
                    onChange={(e) => {
                      setBuildDaysInput(e.target.value);
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) setEstimatedBuildDays(v);
                    }}
                    onBlur={() => setBuildDaysInput(String(estimatedBuildDays))}
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] text-[#1E293B] focus:outline-none focus:border-[#93C5FD] focus:bg-white transition-colors"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  days
                </p>
              </div>
              {/* Summary chip */}
              {buildTargetDate && (
                <div className="pb-0.5">
                  <div
                    className="px-3 py-2 rounded-lg border text-[12px]"
                    style={{ background: "#EFF6FF", borderColor: "#BFDBFE", fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    <span className="text-[#64748B]">Target:</span>{" "}
                    <span style={{ fontWeight: 600, color: "#1D4ED8" }}>
                      {new Date(buildTargetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="text-[#94A3B8] ml-2">· {estimatedBuildDays}d build</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );

  // ── Stage: uploading ────────────────────────────────────────────────────────
  const renderUploading = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#EFF4FA] flex items-center justify-center">
          <Loader2 size={26} color="#1B3A5C" className="animate-spin" />
        </div>
        <div className="text-center">
          <p
            className="text-[#1E293B]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 15 }}
          >
            Uploading {fileName}
          </p>
          <p className="text-[13px] text-[#94A3B8] mt-1" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Verifying ZIP structure and file integrity...
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-64 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#1B3A5C]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );

  // ── Stage: processing ───────────────────────────────────────────────────────
  const renderProcessing = () => (
    <div className="flex-1 flex flex-col gap-5 px-6 py-5 min-h-0">
      {/* File chip */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[13px] text-[#1E293B]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
          <FileArchive size={13} color="#1B3A5C" />
          {fileName}
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#2563EB] text-[11px]" style={{ fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          <Loader2 size={11} className="animate-spin" />
          Processing
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-[#0F2035]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>
              Analysis Pipeline
            </h3>
            <p className="text-[12px] text-[#94A3B8] mt-0.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {completedSteps.length} of {PIPELINE_STEPS.length} steps complete
            </p>
          </div>
          {/* Overall progress */}
          <div className="text-right">
            <p className="text-[20px] text-[#1B3A5C]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, lineHeight: 1 }}>
              {Math.round((completedSteps.length / PIPELINE_STEPS.length) * 100)}%
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">complete</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-start w-full overflow-x-auto pb-1">
          {PIPELINE_STEPS.map((step, i) => {
            const status = completedSteps.includes(i)
              ? "complete"
              : currentStep === i
              ? "active"
              : "pending";
            return (
              <StepNode
                key={step.id}
                step={step}
                status={status}
                isLast={i === PIPELINE_STEPS.length - 1}
                isCurrent={currentStep === i}
              />
            );
          })}
        </div>

        {/* Overall progress bar */}
        <div className="mt-4 h-1 rounded-full bg-[#F1F5F9] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#1B3A5C] to-[#3B82F6]"
            animate={{ width: `${(completedSteps.length / PIPELINE_STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Current step detail */}
      <AnimatePresence mode="wait">
        {currentStep >= 0 && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-xl border border-[#BFDBFE] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <Loader2 size={14} color="#3B82F6" className="animate-spin" />
              </div>
              <div>
                <p className="text-[13px] text-[#1E293B]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>
                  {PIPELINE_STEPS[currentStep]?.label}
                </p>
                <p className="text-[12px] text-[#64748B] mt-0.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {PIPELINE_STEPS[currentStep]?.detail}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log console */}
      <div className="bg-[#0F2035] rounded-xl border border-[#1a3a5c] flex-1 min-h-0 flex flex-col overflow-hidden" style={{ maxHeight: 180 }}>
        <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2 shrink-0">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <span className="text-[11px] text-[#4A7FA5]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            analysis.log
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1" style={{ fontFamily: "'IBM Plex Sans', monospace" }}>
          <p className="text-[#4A7FA5]">$ eci-analyze --assembly 845-000112</p>
          {log.map((entry, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={entry.msg.startsWith("✓") ? "text-[#34D399]" : "text-[#94A3B8]"}
            >
              {entry.msg.startsWith("✓") ? entry.msg : `  → ${entry.msg}`}
            </motion.p>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );

  // ── Stage: complete ─────────────────────────────────────────────────────────
  const renderComplete = () => (
    <div className="flex-1 flex flex-col px-6 py-6 gap-5">
      {/* Success banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-5 flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
          <CheckCircle2 size={20} color="#16A34A" />
        </div>
        <div className="flex-1">
          <p className="text-[#15803D]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 15 }}>
            Analysis complete
          </p>
          <p className="text-[13px] text-[#4ADE80]/80 mt-0.5" style={{ color: "#16A34A", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            All 7 pipeline stages completed successfully. Results are ready to explore.
          </p>
        </div>
        <button onClick={handleReset} className="text-[#94A3B8] hover:text-[#64748B] transition-colors">
          <X size={15} />
        </button>
      </motion.div>

      {/* Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-[#F1F5F9]" style={{ background: "#FAFBFD" }}>
          <h3 className="text-[#0F2035]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>
            Analysis Results
          </h3>
          <p className="text-[12px] text-[#94A3B8] mt-0.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Summary of processed assembly data
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#F1F5F9]">
          {/* Assembly */}
          <div className="p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <Package size={13} color="#94A3B8" />
              <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
                Assembly
              </span>
            </div>
            <p className="text-[22px] text-[#0F2035]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, lineHeight: 1 }}>
              845-000112
            </p>
            <p className="text-[12px] text-[#64748B]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Right Shoulder Assembly</p>
          </div>

          {/* Total parts */}
          <div className="p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <List size={13} color="#94A3B8" />
              <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
                Total Parts
              </span>
            </div>
            <p className="text-[22px] text-[#0F2035]" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, lineHeight: 1 }}>53</p>
            <p className="text-[12px] text-[#64748B]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Across all subsystems
            </p>
          </div>

          {/* Files processed */}
          <div className="p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <FileArchive size={13} color="#94A3B8" />
              <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
                Files Processed
              </span>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {[
                { label: "3D Files", icon: Box, color: "#1B3A5C", bg: "#EFF4FA" },
                { label: "Technical Drawings", icon: FileText, color: "#7C3AED", bg: "#F5F3FF" },
                { label: "BOM Spreadsheet", icon: FileSpreadsheet, color: "#059669", bg: "#F0FDF4" },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: f.bg }}>
                      <Icon size={11} color={f.color} />
                    </div>
                    <span className="text-[12px] text-[#475569]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                      {f.label}
                    </span>
                    <CheckCircle2 size={11} color="#10B981" className="ml-auto" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Completed pipeline summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="bg-white rounded-xl border border-[#E2E8F0] p-5"
      >
        <p className="text-[12px] text-[#64748B] uppercase tracking-wider mb-4" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
          Completed Pipeline
        </p>
        <div className="grid grid-cols-7 gap-2">
          {PIPELINE_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] border border-[#BBF7D0] flex items-center justify-center">
                  <Icon size={13} color="#059669" />
                </div>
                <p className="text-[10px] text-[#64748B] text-center leading-tight" style={{ fontFamily: "'IBM Plex Sans', sans-serif", width: 60 }}>
                  {step.shortLabel}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Navigation CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate("/overview")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1B3A5C] text-white text-[13px] hover:bg-[#162F4A] transition-colors"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
        >
          <LayoutDashboard size={14} />
          Overview
        </button>
        <button
          onClick={() => navigate("/cost-interventions")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[#1B3A5C] text-[13px] hover:border-[#1B3A5C]/30 hover:bg-[#EFF4FA] transition-colors"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
        >
          View Cost Interventions
          <ArrowRight size={13} />
        </button>
        <button
          onClick={() => navigate("/bom-analysis")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[#1B3A5C] text-[13px] hover:border-[#1B3A5C]/30 hover:bg-[#EFF4FA] transition-colors"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}
        >
          View BOM Analysis
          <ArrowRight size={13} />
        </button>
      </motion.div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col min-h-full"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">Dashboard</span>
          <ChevronRight size={12} className="text-[#CBD5E1]" />
          <span className="text-[11px] text-[#64748B] uppercase tracking-wider">Upload & Analysis</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#0F2035]" style={{ fontWeight: 600 }}>
              {stage === "idle"
                ? "Upload Assembly Package"
                : stage === "uploading"
                ? "Uploading..."
                : stage === "processing"
                ? "Running Analysis Pipeline"
                : "Analysis Complete"}
            </h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              {stage === "idle"
                ? "Upload a ZIP file containing STEP files, engineering drawings, and a BOM spreadsheet"
                : stage === "uploading"
                ? "Verifying your uploaded package..."
                : stage === "processing"
                ? "Extracting data and identifying cost reduction opportunities"
                : "All pipeline stages completed — results ready for exploration"}
            </p>
          </div>

          {/* Step indicator pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] shrink-0"
            style={{
              borderColor: stage === "complete" ? "#BBF7D0" : "#E2E8F0",
              background: stage === "complete" ? "#F0FDF4" : "white",
              color: stage === "complete" ? "#16A34A" : "#64748B",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            {stage === "complete" ? (
              <CheckCircle2 size={12} color="#16A34A" />
            ) : stage === "processing" ? (
              <Loader2 size={12} className="animate-spin text-[#3B82F6]" />
            ) : (
              <Circle size={12} className="text-[#CBD5E1]" />
            )}
            {stage === "idle"
              ? "Awaiting upload"
              : stage === "uploading"
              ? "Uploading..."
              : stage === "processing"
              ? `Step ${completedSteps.length + 1} of ${PIPELINE_STEPS.length}`
              : "Complete"}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#E2E8F0] shrink-0" />

      {/* Content */}
      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {renderUpload()}
          </motion.div>
        )}
        {stage === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {renderUploading()}
          </motion.div>
        )}
        {stage === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {renderProcessing()}
          </motion.div>
        )}
        {stage === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {renderComplete()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}