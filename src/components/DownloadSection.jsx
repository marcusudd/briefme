"use client";

import { Download, FileAudio, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  const handleAudioPlay = (currentKey) => {
    const players = document.querySelectorAll("audio[data-audio-key]");
    players.forEach((player) => {
      if (player.dataset.audioKey !== currentKey && !player.paused) {
        player.pause();
      }
    });
  };

  const audioUrls = useMemo(
    () =>
      items.map((item) => ({
        key: item.filename,
        url: URL.createObjectURL(
          new Blob([Uint8Array.from(atob(item.audioBase64), (c) => c.charCodeAt(0))], {
            type: "audio/mpeg",
          })
        ),
      })),
    [items]
  );

  useEffect(
    () => () => {
      audioUrls.forEach((entry) => URL.revokeObjectURL(entry.url));
    },
    [audioUrls]
  );

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
            className="overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/5"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                <FileAudio className="h-5 w-5 text-emerald-400" />
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
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>

            <div className="border-t border-emerald-500/20 bg-slate-900/20 px-4 py-3">
              <audio
                controls
                preload="none"
                className="w-full"
                data-audio-key={item.filename}
                onPlay={() => handleAudioPlay(item.filename)}
                src={audioUrls.find((entry) => entry.key === item.filename)?.url}
              />
            </div>

            {expandedSummary === item.filename && item.summary && (
              <div className="border-t border-emerald-500/20 bg-slate-900/40 px-4 py-4">
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
