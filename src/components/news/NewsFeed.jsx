"use client";

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Filter } from "lucide-react";
import { NewsCard } from "./NewsCard";

const SORT_OPTIONS = [
  { value: "date", label: "Date (newest)" },
  { value: "relevance", label: "Relevance" },
  { value: "trending", label: "Trending" },
  { value: "source", label: "Source A–Z" },
];

function sortItems(items, sortBy) {
  const sorted = [...items];
  switch (sortBy) {
    case "relevance":
      sorted.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
      break;
    case "trending":
      sorted.sort((a, b) => {
        const countDiff = (b.source_count ?? 1) - (a.source_count ?? 1);
        if (countDiff !== 0) return countDiff;
        return (b.relevance_score ?? 0) - (a.relevance_score ?? 0);
      });
      break;
    case "source":
      sorted.sort((a, b) => {
        const nameCmp = (a.source_name || "").localeCompare(b.source_name || "");
        if (nameCmp !== 0) return nameCmp;
        return (b.date || "").localeCompare(a.date || "");
      });
      break;
    case "date":
    default:
      sorted.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      break;
  }
  return sorted;
}

export function NewsFeed({ items, selectedUrls, onToggle, feedRegistry }) {
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const feedIdToCategory = {};
  if (feedRegistry) {
    for (const feed of feedRegistry) {
      feedIdToCategory[feed.id] = feed.category;
    }
  }

  const enrichedItems = items.map((item) => ({
    ...item,
    _category: feedIdToCategory[item.feed_id] || "worldwide-tier1",
  }));

  const sources = [...new Set(items.map((it) => it.source_name))].sort();

  const filtered =
    sourceFilter === "all"
      ? enrichedItems
      : enrichedItems.filter((it) => it.source_name === sourceFilter);

  const sorted = useMemo(() => sortItems(filtered, sortBy), [filtered, sortBy]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {sources.length > 1 && (
          <>
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 outline-none transition focus:border-lime-300/70"
            >
              <option value="all">All sources ({items.length})</option>
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src} ({items.filter((it) => it.source_name === src).length})
                </option>
              ))}
            </select>
          </>
        )}

        <ArrowDownWideNarrow className="ml-auto h-4 w-4 text-slate-500" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 outline-none transition focus:border-lime-300/70"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">No news items found.</div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((item, idx) => (
            <NewsCard
              key={`${item.feed_id}-${item.source_url}-${idx}`}
              item={item}
              selected={selectedUrls.has(item.source_url)}
              onToggle={() => onToggle(item.source_url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
