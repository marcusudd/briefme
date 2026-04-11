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
        className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1 text-xs text-slate-400 transition hover:border-violet-500/50 hover:text-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
