"use client";

import { Lightbulb } from "lucide-react";

const EXAMPLES = [
  "Focus on actionable steps and frameworks",
  "Highlight key statistics and data points",
  "Emphasize practical business applications",
  "Extract the main arguments and counterarguments",
];

export function FocusPrompt({ value, onChange, disabled }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Focus Instructions{" "}
        <span className="ml-1 font-normal normal-case text-slate-500">
          (optional)
        </span>
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Focus on actionable takeaways and key frameworks I can apply immediately..."
        rows={3}
        disabled={disabled}
        className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-lime-300/70 focus:outline-none focus:ring-2 focus:ring-lime-300/20 disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Lightbulb className="h-3 w-3" />
          Quick add:
        </span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            onClick={() => onChange(example)}
            disabled={disabled}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:border-lime-300/40 hover:text-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
