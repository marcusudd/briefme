"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Newspaper, RefreshCw, Settings2 } from "lucide-react";
import { NewsFeed } from "@/components/news/NewsFeed";
import { FeedChooser } from "@/components/news/FeedChooser";
import {
  buildNewsHandoffParam,
  fetchFeedRegistry,
  fetchNewsItems,
  loadEnabledFeeds,
  saveEnabledFeeds,
} from "@/lib/newsFeeds";

export default function NewsPage() {
  const router = useRouter();
  const [feedRegistry, setFeedRegistry] = useState([]);
  const [enabledFeeds, setEnabledFeeds] = useState(new Set());
  const [newsItems, setNewsItems] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const [chooserOpen, setChooserOpen] = useState(false);

  useEffect(() => {
    fetchFeedRegistry()
      .then((feeds) => {
        setFeedRegistry(feeds);
        const initial = loadEnabledFeeds(feeds);
        if (initial) setEnabledFeeds(initial);
      })
      .catch(() => {});
  }, []);

  const fetchNews = useCallback(
    async (forceRefresh = false) => {
      if (enabledFeeds.size === 0) {
        setNewsItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { items, fetchedAt: fetchedAtValue } = await fetchNewsItems(
          [...enabledFeeds],
          { forceRefresh },
        );
        setNewsItems(items);
        setFetchedAt(fetchedAtValue);
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
      fetchNews();
    }
  }, [enabledFeeds, fetchNews]);

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

  const handleAddToMainWorkflow = () => {
    if (selectedUrls.size === 0) return;
    const handoff = buildNewsHandoffParam([...selectedUrls]);
    router.push(`/?newsUrls=${handoff}`);
  };

  return (
    <div className="min-h-screen bg-transparent px-3 py-6 sm:px-4 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300/15 ring-1 ring-lime-300/35">
            <Newspaper className="h-7 w-7 text-lime-200" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.12em] text-white sm:text-4xl">
            AI News
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm tracking-wide text-slate-300 sm:text-base">
            Latest AI news from your selected feeds — pick articles to summarize or generate an
            audio digest
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNews(true)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {fetchedAt && (
              <span className="font-mono text-xs text-slate-500">
                {newsItems.length} items
              </span>
            )}
          </div>
          <button
            onClick={() => setChooserOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10"
          >
            <Settings2 className="h-4 w-4" />
            Feeds ({enabledFeeds.size})
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-lime-200" />
          </div>
        ) : (
          <NewsFeed
            items={newsItems}
            selectedUrls={selectedUrls}
            onToggle={toggleUrl}
            feedRegistry={feedRegistry}
          />
        )}

        <div className="sticky bottom-0 z-10 rounded-2xl border border-white/10 bg-zinc-950/90 p-2.5 backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="font-mono text-sm tracking-wide text-slate-200">
              {selectedUrls.size} article{selectedUrls.size !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={handleAddToMainWorkflow}
              disabled={selectedUrls.size === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-zinc-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Add to main workflow
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600">
          News discovery page — processing happens in the main pipeline on /
        </p>
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
