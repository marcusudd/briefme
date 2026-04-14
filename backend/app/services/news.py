from __future__ import annotations

import asyncio
import time
from datetime import datetime
from typing import Any

import feedparser
import httpx
from bs4 import BeautifulSoup

from .feed_registry import AI_KEYWORDS, FEED_MAP, get_all_feeds, get_default_feed_ids

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

CACHE_TTL_SECONDS = 1800  # 30 minutes

_cache: dict[str, dict[str, Any]] = {}


def _is_cache_valid(feed_id: str) -> bool:
    entry = _cache.get(feed_id)
    if not entry:
        return False
    return (time.time() - entry["ts"]) < CACHE_TTL_SECONDS


def clear_cache(feed_ids: list[str] | None = None) -> None:
    if feed_ids is None:
        _cache.clear()
    else:
        for fid in feed_ids:
            _cache.pop(fid, None)


def _matches_ai_keywords(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in AI_KEYWORDS)


def _parse_date(entry: dict) -> str:
    """Return an ISO 8601 date string from a feedparser entry.

    feedparser provides *_parsed fields as time.struct_time which we
    convert to a sortable ISO string. Falls back to the raw string if
    parsing isn't available, and tries manual parsing as a last resort.
    """
    import calendar

    for field in ("published_parsed", "updated_parsed"):
        parsed = entry.get(field)
        if parsed:
            try:
                ts = calendar.timegm(parsed)
                return datetime.utcfromtimestamp(ts).strftime("%Y-%m-%dT%H:%M:%SZ")
            except (ValueError, TypeError, OverflowError):
                continue

    for field in ("published", "updated"):
        raw = entry.get(field, "").strip()
        if raw:
            normalized = _try_normalize_date(raw)
            return normalized if normalized else raw

    return ""


def _try_normalize_date(raw: str) -> str | None:
    from datetime import timezone as tz

    formats = (
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
        "%B %d, %Y",
        "%b %d, %Y",
    )
    for fmt in formats:
        try:
            dt = datetime.strptime(raw, fmt)
            if dt.tzinfo:
                dt = dt.astimezone(tz.utc).replace(tzinfo=None)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        except (ValueError, TypeError):
            continue
    return None


def _normalize_rss_items(entries: list[dict], feed_id: str, feed_name: str) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for entry in entries[:30]:
        title = entry.get("title", "").strip()
        summary = entry.get("summary", "").strip()
        link = entry.get("link", "").strip()
        if not title or not link:
            continue
        if len(summary) > 500:
            summary = summary[:497] + "..."
        items.append({
            "title": title,
            "date": _parse_date(entry),
            "summary": BeautifulSoup(summary, "html.parser").get_text(" ", strip=True) if summary else "",
            "source_url": link,
            "source_name": feed_name,
            "feed_id": feed_id,
        })
    return items


async def _fetch_rss(feed_id: str, url: str, name: str, filter_keywords: bool = False) -> list[dict[str, str]]:
    if _is_cache_valid(feed_id):
        return _cache[feed_id]["items"]

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            res = await client.get(url, headers=_HEADERS)
        if res.status_code != 200:
            return []
        parsed = feedparser.parse(res.text)
        items = _normalize_rss_items(parsed.entries, feed_id, name)

        if filter_keywords:
            items = [it for it in items if _matches_ai_keywords(it["title"] + " " + it["summary"])]

        _cache[feed_id] = {"items": items, "ts": time.time()}
        return items
    except Exception:
        return []


# --- Scrapers for sites without RSS ---

async def _scrape_crescendo(feed_id: str) -> list[dict[str, str]]:
    if _is_cache_valid(feed_id):
        return _cache[feed_id]["items"]

    url = "https://www.crescendo.ai/news/latest-ai-news-and-updates"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            res = await client.get(url, headers=_HEADERS)
        if res.status_code != 200:
            return []
        soup = BeautifulSoup(res.text, "html.parser")
        items: list[dict[str, str]] = []
        for heading in soup.find_all("h3"):
            title = heading.get_text(strip=True)
            if not title:
                continue
            summary = ""
            date = ""
            sibling = heading.find_next_sibling()
            while sibling and sibling.name != "h3":
                text = sibling.get_text(strip=True)
                if text.startswith("Date:"):
                    date = text.replace("Date:", "").strip()
                elif text.startswith("Summary:"):
                    summary = text.replace("Summary:", "").strip()
                sibling = sibling.find_next_sibling()

            source_link = url
            link_tag = heading.find_next("a", href=True)
            if link_tag and link_tag.get("href", "").startswith("http"):
                source_link = link_tag["href"]

            items.append({
                "title": title,
                "date": _try_normalize_date(date) or date,
                "summary": summary[:500] if summary else "",
                "source_url": source_link,
                "source_name": "Crescendo AI",
                "feed_id": feed_id,
            })

        _cache[feed_id] = {"items": items[:20], "ts": time.time()}
        return items[:20]
    except Exception:
        return []


async def _scrape_anthropic(feed_id: str) -> list[dict[str, str]]:
    if _is_cache_valid(feed_id):
        return _cache[feed_id]["items"]

    url = "https://www.anthropic.com/news"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            res = await client.get(url, headers=_HEADERS)
        if res.status_code != 200:
            return []
        soup = BeautifulSoup(res.text, "html.parser")
        items: list[dict[str, str]] = []
        for article in soup.find_all("a", href=True):
            href = article.get("href", "")
            if "/news/" not in href or href.rstrip("/") == "/news":
                continue
            title_el = article.find(["h2", "h3", "h4"])
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title:
                continue
            full_url = href if href.startswith("http") else f"https://www.anthropic.com{href}"
            summary_el = article.find("p")
            summary = summary_el.get_text(strip=True)[:500] if summary_el else ""
            time_el = article.find("time")
            raw_date = time_el.get_text(strip=True) if time_el else ""
            items.append({
                "title": title,
                "date": _try_normalize_date(raw_date) or raw_date,
                "summary": summary,
                "source_url": full_url,
                "source_name": "Anthropic",
                "feed_id": feed_id,
            })

        seen_titles: set[str] = set()
        deduped: list[dict[str, str]] = []
        for item in items:
            if item["title"] not in seen_titles:
                seen_titles.add(item["title"])
                deduped.append(item)

        _cache[feed_id] = {"items": deduped[:20], "ts": time.time()}
        return deduped[:20]
    except Exception:
        return []


async def _scrape_ai_sweden(feed_id: str) -> list[dict[str, str]]:
    if _is_cache_valid(feed_id):
        return _cache[feed_id]["items"]

    url = "https://www.ai.se/en/news"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            res = await client.get(url, headers=_HEADERS)
        if res.status_code != 200:
            return []
        soup = BeautifulSoup(res.text, "html.parser")
        items: list[dict[str, str]] = []
        for article in soup.find_all("article"):
            link_tag = article.find("a", href=True)
            title_tag = article.find(["h2", "h3", "h4"])
            if not link_tag or not title_tag:
                continue
            title = title_tag.get_text(strip=True)
            href = link_tag["href"]
            full_url = href if href.startswith("http") else f"https://www.ai.se{href}"
            summary_el = article.find("p")
            summary = summary_el.get_text(strip=True)[:500] if summary_el else ""
            time_el = article.find("time")
            raw_date = time_el.get_text(strip=True) if time_el else ""
            items.append({
                "title": title,
                "date": _try_normalize_date(raw_date) or raw_date,
                "summary": summary,
                "source_url": full_url,
                "source_name": "AI Sweden",
                "feed_id": feed_id,
            })

        _cache[feed_id] = {"items": items[:20], "ts": time.time()}
        return items[:20]
    except Exception:
        return []


async def _scrape_sweden_gov(feed_id: str) -> list[dict[str, str]]:
    if _is_cache_valid(feed_id):
        return _cache[feed_id]["items"]

    url = "https://www.government.se/press-releases/"
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            res = await client.get(url, headers=_HEADERS)
        if res.status_code != 200:
            return []
        soup = BeautifulSoup(res.text, "html.parser")
        items: list[dict[str, str]] = []
        for link_tag in soup.find_all("a", href=True):
            href = link_tag.get("href", "")
            if "/press-releases/" not in href:
                continue
            title = link_tag.get_text(strip=True)
            if not title or len(title) < 10:
                continue
            if not _matches_ai_keywords(title):
                continue
            full_url = href if href.startswith("http") else f"https://www.government.se{href}"
            items.append({
                "title": title,
                "date": "",
                "summary": "",
                "source_url": full_url,
                "source_name": "Swedish Government",
                "feed_id": feed_id,
            })

        seen: set[str] = set()
        deduped: list[dict[str, str]] = []
        for item in items:
            if item["title"] not in seen:
                seen.add(item["title"])
                deduped.append(item)

        _cache[feed_id] = {"items": deduped[:15], "ts": time.time()}
        return deduped[:15]
    except Exception:
        return []


_SCRAPER_MAP: dict[str, Any] = {
    "crescendo-ai": _scrape_crescendo,
    "anthropic-news": _scrape_anthropic,
    "ai-sweden": _scrape_ai_sweden,
    "sweden-gov-ai": _scrape_sweden_gov,
}

KEYWORD_FILTER_FEEDS = {"computer-sweden"}


async def fetch_feed(feed_id: str) -> list[dict[str, str]]:
    feed = FEED_MAP.get(feed_id)
    if not feed:
        return []

    if feed["type"] == "scrape":
        scraper = _SCRAPER_MAP.get(feed_id)
        if scraper:
            return await scraper(feed_id)
        return []

    return await _fetch_rss(
        feed_id,
        str(feed["url"]),
        str(feed["name"]),
        filter_keywords=(feed_id in KEYWORD_FILTER_FEEDS),
    )


def _deduplicate(items: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    result: list[dict[str, str]] = []
    for item in items:
        key = item["title"].lower().strip()
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


async def fetch_news(feed_ids: list[str] | None = None) -> list[dict[str, str]]:
    if not feed_ids:
        feed_ids = get_default_feed_ids()

    tasks = [fetch_feed(fid) for fid in feed_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_items: list[dict[str, str]] = []
    for result in results:
        if isinstance(result, list):
            all_items.extend(result)

    deduped = _deduplicate(all_items)

    def sort_key(item: dict[str, str]) -> str:
        return item.get("date", "") or ""

    deduped.sort(key=sort_key, reverse=True)
    return deduped


def get_fetched_at() -> str:
    return datetime.utcnow().isoformat() + "Z"
