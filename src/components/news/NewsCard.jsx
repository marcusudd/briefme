"use client";

import { ExternalLink, Check, TrendingUp } from "lucide-react";

const SOURCE_COLORS = {
  "worldwide-tier1": "bg-lime-300/15 text-lime-200 ring-lime-300/30",
  "worldwide-tier2": "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  sweden: "bg-amber-300/15 text-amber-200 ring-amber-300/30",
};

function scoreBadgeClass(score) {
  if (score >= 70) return "bg-emerald-400/20 text-emerald-300 ring-emerald-400/40";
  if (score >= 40) return "bg-amber-400/20 text-amber-300 ring-amber-400/40";
  return "bg-slate-400/20 text-slate-400 ring-slate-400/30";
}

export function NewsCard({ item, selected, onToggle }) {
  const badgeClass = SOURCE_COLORS[item._category] || SOURCE_COLORS["worldwide-tier1"];

  return (
    <div
      onClick={onToggle}
      className={`group cursor-pointer rounded-xl border p-3.5 transition ${
        selected
          ? "border-lime-300/45 bg-lime-300/10"
          : "border-white/10 bg-white/[0.03] hover:border-white/25"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
            selected
              ? "border-lime-300 bg-lime-300"
              : "border-slate-600 bg-zinc-900 group-hover:border-slate-500"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${badgeClass}`}
            >
              {item.source_name}
            </span>
            {item.relevance_score > 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${scoreBadgeClass(item.relevance_score)}`}
              >
                <TrendingUp className="h-3 w-3" />
                {item.relevance_score}
              </span>
            )}
            {item.date && <span className="text-xs text-slate-500">{item.date}</span>}
          </div>

          <h3 className="text-sm font-semibold leading-snug text-slate-200">{item.title}</h3>

          {item.summary && (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-400">{item.summary}</p>
          )}

          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-lime-200"
          >
            Read original
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
