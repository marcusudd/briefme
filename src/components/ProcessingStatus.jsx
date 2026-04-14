"use client";

import { CheckCircle2, XCircle, Loader2, Clock, Video } from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, className: "text-slate-500" },
  extracting: {
    label: "Extracting content…",
    icon: Loader2,
    className: "text-blue-400",
    spin: true,
  },
  summarizing: {
    label: "Summarizing with AI...",
    icon: Loader2,
    className: "text-lime-200",
    spin: true,
  },
  generating: {
    label: "Generating audio...",
    icon: Loader2,
    className: "text-amber-400",
    spin: true,
  },
  done: { label: "Complete", icon: CheckCircle2, className: "text-emerald-400" },
  error: { label: "Failed", icon: XCircle, className: "text-red-400" },
};

function truncateUrl(url, maxLen = 50) {
  if (url.length <= maxLen) return url;
  return `${url.slice(0, maxLen)}…`;
}

export function ProcessingStatus({ videos }) {
  if (videos.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Processing Status
      </label>

      <div className="overflow-hidden rounded-xl border border-white/15 bg-white/5">
        {videos.map((video, index) => {
          const config = STATUS_CONFIG[video.status];
          const Icon = config.icon;
          return (
            <div
              key={video.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                index < videos.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/25">
                <Video className="h-4 w-4 text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-300">
                  {video.title || truncateUrl(video.url)}
                </div>
                {video.error && (
                  <div className="mt-0.5 text-xs text-red-400">{video.error}</div>
                )}
              </div>
              <div className={`flex items-center gap-1.5 shrink-0 ${config.className}`}>
                <Icon className={`h-4 w-4 ${config.spin ? "animate-spin" : ""}`} />
                <span className="hidden font-mono text-xs uppercase tracking-[0.08em] sm:block">
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
