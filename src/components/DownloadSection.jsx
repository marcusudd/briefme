"use client";

import { Download, FileAudio, ChevronDown, ChevronUp, Play } from "lucide-react";
import { useState } from "react";

function downloadMp3(audioBase64, filename) {
  const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DownloadSection({ items }) {
  const [expandedSummary, setExpandedSummary] = useState(null);
  const handlePlay = (item) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("briefme:play-audio", {
        detail: {
          audioBase64: item.audioBase64,
          filename: item.filename,
          label: item.label,
        },
      })
    );
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Downloads Ready
      </label>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.filename}
            className="overflow-hidden rounded-xl border border-lime-300/35 bg-lime-300/10"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-300/20">
                <FileAudio className="h-5 w-5 text-lime-100" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-200">{item.label}</div>
                <div className="text-xs text-slate-500">{item.filename}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.summary && (
                  <button
                    onClick={() =>
                      setExpandedSummary(expandedSummary === item.filename ? null : item.filename)
                    }
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-700/50 hover:text-slate-300"
                  >
                    Summary
                    {expandedSummary === item.filename ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => downloadMp3(item.audioBase64, item.filename)}
                  className="flex items-center gap-2 rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>

            <div className="border-t border-lime-300/25 bg-black/20 px-4 py-3">
              <button
                type="button"
                onClick={() => handlePlay(item)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:bg-white/10"
              >
                <Play className="h-3.5 w-3.5" />
                Play in persistent player
              </button>
            </div>

            {expandedSummary === item.filename && item.summary && (
              <div className="border-t border-lime-300/25 bg-black/35 px-4 py-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {item.summary}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
