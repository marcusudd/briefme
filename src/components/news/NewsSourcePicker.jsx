"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Newspaper, RefreshCw, Settings2, TrendingUp, List } from "lucide-react";
import { NewsFeed } from "./NewsFeed";
import { RecommendedCard } from "./RecommendedCard";
import { FeedChooser } from "./FeedChooser";
import {
  fetchFeedRegistry,
  fetchNewsItems,
  fetchRecommendations,
  loadEnabledFeeds,
  saveEnabledFeeds,
} from "@/lib/newsFeeds";

const TABS = [
  { id: "all", label: "All", icon: List },
  { id: "recommended", label: "Recommended", icon: TrendingUp },
];

export function NewsSourcePicker({ onAddUrls, disabled }) {
  const [feedRegistry, setFeedRegistry] = useState([]);
  const [enabledFeeds, setEnabledFeeds] = useState(new Set());
  const [newsItems, setNewsItems] = useState([]);
  const [recommendedItems, setRecommendedItems] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const [chooserOpen, setChooserOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("recommended");

  useEffect(() => {
    let cancelled = false;
    fetchFeedRegistry()
      .then((feeds) => {
        if (cancelled) return;
        setFeedRegistry(feeds);
        setEnabledFeeds(loadEnabledFeeds(feeds));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load feeds");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshNews = useCallback(
    async (forceRefresh = false) => {
      if (enabledFeeds.size === 0) {
        setNewsItems([]);
        setRecommendedItems([]);
        setFetchedAt(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const ids = [...enabledFeeds];
        const opts = { forceRefresh };
        const [newsResult, recResult] = await Promise.all([
          fetchNewsItems(ids, opts),
          fetchRecommendations(ids, opts),
        ]);
        setNewsItems(newsResult.items);
        setRecommendedItems(recResult.items);
        setFetchedAt(newsResult.fetchedAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch news");
      } finally {
        setLoading(false);
      }
    },
    [enabledFeeds],
  );

  useEffect(() => {
    if (enabledFeeds.size > 0) {
      refreshNews();
    }
  }, [enabledFeeds, refreshNews]);

  const handleFeedChange = (newSet) => {
    setEnabledFeeds(newSet);
    saveEnabledFeeds(newSet);
    setSelectedUrls(new Set());
  };

  const toggleUrl = (url) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleAddSelected = () => {
    if (selectedUrls.size === 0) return;
    onAddUrls([...selectedUrls]);
    setSelectedUrls(new Set());
  };

  const displayItems = activeTab === "recommended" ? recommendedItems : newsItems;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-lime-200" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            Add From AI News Feed
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshNews(true)}
            disabled={loading || disabled}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setChooserOpen(true)}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Feeds ({enabledFeeds.size})
          </button>
        </div>
      </div>

      <div className="mb-3 flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                isActive
                  ? "bg-white/10 text-lime-200"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="max-h-[360px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-lime-200" />
          </div>
        ) : activeTab === "recommended" ? (
          recommendedItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No recommendations yet. Enable more feeds for better results.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recommendedItems.map((item, idx) => (
                <RecommendedCard
                  key={`rec-${item.feed_id}-${item.source_url}-${idx}`}
                  item={item}
                  selected={selectedUrls.has(item.source_url)}
                  onToggle={() => toggleUrl(item.source_url)}
                />
              ))}
            </div>
          )
        ) : (
          <NewsFeed
            items={newsItems}
            selectedUrls={selectedUrls}
            onToggle={toggleUrl}
            feedRegistry={feedRegistry}
          />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <p className="font-mono text-xs text-slate-500">
          {fetchedAt
            ? `${displayItems.length} item${displayItems.length !== 1 ? "s" : ""} loaded`
            : "No feed data yet"}
        </p>
        <button
          onClick={handleAddSelected}
          disabled={selectedUrls.size === 0 || disabled}
          className="rounded-xl bg-lime-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-zinc-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add {selectedUrls.size > 0 ? selectedUrls.size : ""} selected to sources
        </button>
      </div>

      <FeedChooser
        feeds={feedRegistry}
        enabledIds={enabledFeeds}
        onChange={handleFeedChange}
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
      />
    </div>
  );
}
