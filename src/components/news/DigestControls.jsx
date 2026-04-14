"use client";

import { Zap, Radio, X } from "lucide-react";

export function DigestControls({
  selectedCount,
  isProcessing,
  onGenerateDigest,
  onSummarizeSelected,
  onClearSelection,
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-300">
          {selectedCount} article{selectedCount !== 1 ? "s" : ""} selected
        </span>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <button
            onClick={onClearSelection}
            disabled={isProcessing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-700 hover:text-slate-200 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>

          <button
            onClick={onSummarizeSelected}
            disabled={isProcessing}
            className="flex items-center gap-1.5 rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-lime-300/20 transition hover:bg-lime-200 active:scale-[0.98] disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {isProcessing ? "Processing…" : "Summarize Each"}
          </button>

          <button
            onClick={onGenerateDigest}
            disabled={isProcessing}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
          >
            <Radio className="h-4 w-4" />
            {isProcessing ? "Generating…" : "Audio Digest"}
          </button>
        </div>
      </div>
    </div>
  );
}
