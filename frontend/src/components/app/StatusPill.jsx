import React from "react";

export function StatusPill({ tone = "bg-slate-50 text-slate-700 border-slate-200", label, dot = true, testid }) {
  return (
    <span className={`pill-sm ${tone}`} data-testid={testid}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      <span>{label}</span>
    </span>
  );
}

export function StageChip({ stage, onClick, testid }) {
  return (
    <button
      onClick={onClick}
      className={`stage-chip ${stage.tone} ${onClick ? "hover:opacity-80 cursor-pointer" : ""}`}
      data-testid={testid}
    >
      {stage.name}
    </button>
  );
}
