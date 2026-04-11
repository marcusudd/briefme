"use client";

import { FileAudio, Files } from "lucide-react";

const OPTIONS = [
  {
    id: "combined",
    icon: FileAudio,
    label: "One combined MP3",
    description: "All source outputs merged into a single audio file",
  },
  {
    id: "separate",
    icon: Files,
    label: "Separate MP3 per source",
    description: "Download individual audio files for each source",
  },
];

export function OutputOptions({ value, onChange, disabled }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Output Format
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id)}
              disabled={disabled}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20"
                  : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? "bg-violet-500/20 text-violet-400" : "bg-slate-700/60 text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div
                  className={`text-sm font-medium ${
                    isSelected ? "text-violet-300" : "text-slate-300"
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
