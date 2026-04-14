const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const STORAGE_KEY = "briefme-enabled-feeds";

export async function fetchFeedRegistry() {
  const res = await fetch(`${API_BASE}/news/feeds`);
  if (!res.ok) {
    throw new Error(`Failed to fetch feeds (${res.status})`);
  }
  return res.json();
}

export async function fetchNewsItems(enabledIds, { forceRefresh = false } = {}) {
  if (!enabledIds || enabledIds.length === 0) {
    return { items: [], fetchedAt: null };
  }
  const feedParam = enabledIds.join(",");
  const qs = forceRefresh ? `&force_refresh=true` : "";
  const res = await fetch(`${API_BASE}/news?feeds=${feedParam}${qs}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch news (${res.status})`);
  }
  const data = await res.json();
  return { items: data.items || [], fetchedAt: data.fetched_at || null };
}

export function getDefaultEnabledFeedIds(feedRegistry) {
  return feedRegistry.filter((f) => f.enabled_by_default).map((f) => f.id);
}

export function loadEnabledFeeds(feedRegistry) {
  if (typeof window === "undefined") return new Set(getDefaultEnabledFeedIds(feedRegistry));
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Set(parsed);
      }
    }
  } catch {}
  return new Set(getDefaultEnabledFeedIds(feedRegistry));
}

export function saveEnabledFeeds(ids) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
}

export async function fetchRecommendations(enabledIds, { forceRefresh = false } = {}) {
  if (!enabledIds || enabledIds.length === 0) {
    return { items: [], fetchedAt: null };
  }
  const feedParam = enabledIds.join(",");
  const qs = forceRefresh ? `&force_refresh=true` : "";
  const res = await fetch(`${API_BASE}/news/recommended?feeds=${feedParam}${qs}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch recommendations (${res.status})`);
  }
  const data = await res.json();
  return { items: data.items || [], fetchedAt: data.fetched_at || null };
}

export function buildNewsHandoffParam(urls) {
  return encodeURIComponent(JSON.stringify(urls));
}

export function parseNewsHandoffParam(rawValue) {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string" && v.trim() !== "");
  } catch {
    return [];
  }
}
