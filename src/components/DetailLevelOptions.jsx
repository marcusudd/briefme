"use client";

import { Zap, Layers, BookOpen } from "lucide-react";

const OPTIONS = [
  {
    id: "essentials",
    icon: Zap,
    label: "Essentials",
    description: "Core points and conclusions only",
  },
  {
    id: "detailed",
    icon: Layers,
    label: "Detailed",
    description: "Key points with evidence and examples",
  },
  {
    id: "thorough",
    icon: BookOpen,
    label: "Thorough",
    description: "Full coverage — nuance, caveats, context",
  },
];

export function DetailLevelOptions({ value, onChange, disabled }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Detail Level
      </label>
      <p className="text-xs text-slate-500">
        Controls what gets included. Length controls how verbosely it&apos;s
        explained — detail controls what survives.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              disabled={disabled}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "border-lime-300/60 bg-lime-300/10 ring-2 ring-lime-300/20"
                  : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? "bg-lime-300/20 text-lime-200"
                    : "bg-zinc-800 text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div
                  className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                    isSelected ? "text-lime-100" : "text-slate-200"
                  }`}
                >
                  {option.label}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {option.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
