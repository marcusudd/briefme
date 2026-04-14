"use client";

import { X, RotateCcw } from "lucide-react";

const CATEGORY_LABELS = {
  "worldwide-tier1": "Worldwide — Essential",
  "worldwide-tier2": "Worldwide — Extended",
  sweden: "Sweden",
};

const CATEGORY_ORDER = ["worldwide-tier1", "worldwide-tier2", "sweden"];

export function FeedChooser({ feeds, enabledIds, onChange, open, onClose }) {
  if (!open) return null;

  const grouped = {};
  for (const feed of feeds) {
    const cat = feed.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(feed);
  }

  const toggle = (id) => {
    const next = new Set(enabledIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  };

  const resetDefaults = () => {
    const defaults = new Set(feeds.filter((f) => f.enabled_by_default).map((f) => f.id));
    onChange(defaults);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-bold text-white">Choose Feeds</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={resetDefaults}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 p-5">
          {CATEGORY_ORDER.map((cat) => {
            const feedsInCat = grouped[cat];
            if (!feedsInCat || feedsInCat.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {CATEGORY_LABELS[cat] || cat}
                </h3>
                <div className="space-y-1">
                  {feedsInCat.map((feed) => {
                    const enabled = enabledIds.has(feed.id);
                    return (
                      <button
                        key={feed.id}
                        onClick={() => toggle(feed.id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                          enabled
                            ? "bg-lime-300/12 text-slate-100"
                            : "text-slate-400 hover:bg-white/5"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                            enabled
                              ? "border-lime-300 bg-lime-300"
                              : "border-slate-600 bg-zinc-900"
                          }`}
                        >
                          {enabled && (
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{feed.name}</div>
                          <div className="truncate text-xs text-slate-500">
                            {feed.type === "scrape" ? "Web scraper" : "RSS feed"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 px-5 py-3 text-center text-xs text-slate-500">
          {enabledIds.size} of {feeds.length} feeds enabled
        </div>
      </div>
    </div>
  );
}
