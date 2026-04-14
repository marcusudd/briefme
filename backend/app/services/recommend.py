from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from typing import Any

from .feed_registry import AI_KEYWORDS, FEED_MAP
from .news import fetch_news, get_fetched_at

STOP_WORDS = frozenset(
    "a an the is are was were be been being have has had do does did will would "
    "shall should may might can could to of in for on with at by from as into "
    "through during before after above below between out off over under again "
    "further then once here there when where why how all each every both few "
    "more most other some such no nor not only own same so than too very and "
    "but or if its it that this these those what which who whom new also just".split()
)

_WORD_RE = re.compile(r"[a-z0-9]+")

_recommend_cache: dict[str, dict[str, Any]] = {}
_CACHE_TTL = 1800


def clear_recommend_cache(feed_ids: list[str] | None = None) -> None:
    if feed_ids is None:
        _recommend_cache.clear()
    else:
        keys_to_remove = [
            k for k in _recommend_cache
            if any(fid in k.split(",") for fid in feed_ids)
        ]
        for k in keys_to_remove:
            del _recommend_cache[k]


def _normalize_title(title: str) -> set[str]:
    words = set(_WORD_RE.findall(title.lower()))
    return words - STOP_WORDS


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union > 0 else 0.0


def _parse_date_rough(date_str: str) -> datetime | None:
    if not date_str:
        return None
    for fmt in (
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
        "%B %d, %Y",
        "%b %d, %Y",
    ):
        try:
            return datetime.strptime(date_str.strip(), fmt).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
    return None


def _recency_multiplier(date_str: str) -> float:
    parsed = _parse_date_rough(date_str)
    if not parsed:
        return 1.0
    now = datetime.now(timezone.utc)
    hours_ago = (now - parsed).total_seconds() / 3600
    if hours_ago < 24:
        return 2.0
    if hours_ago < 48:
        return 1.5
    return 1.0


def _tier_weight(feed_id: str) -> float:
    feed = FEED_MAP.get(feed_id)
    if not feed:
        return 1.0
    cat = str(feed.get("category", ""))
    if cat == "worldwide-tier1":
        return 1.5
    return 1.0


def _source_weight(count: int) -> float:
    if count <= 1:
        return 1.0
    if count == 2:
        return 3.0
    if count == 3:
        return 5.0
    return 5.0 + (count - 3) * 2.0


def cluster_items(
    items: list[dict[str, str]], threshold: float = 0.35
) -> list[dict[str, Any]]:
    normalized = [(item, _normalize_title(item.get("title", ""))) for item in items]
    assigned: list[bool] = [False] * len(items)
    clusters: list[dict[str, Any]] = []

    for i, (item_i, words_i) in enumerate(normalized):
        if assigned[i]:
            continue
        cluster_items_list = [item_i]
        cluster_feeds = {item_i.get("feed_id", "")}
        cluster_sources = {item_i.get("source_name", "")}
        assigned[i] = True

        for j in range(i + 1, len(normalized)):
            if assigned[j]:
                continue
            item_j, words_j = normalized[j]
            if _jaccard(words_i, words_j) >= threshold:
                if item_j.get("source_name", "") not in cluster_sources:
                    cluster_items_list.append(item_j)
                    cluster_feeds.add(item_j.get("feed_id", ""))
                    cluster_sources.add(item_j.get("source_name", ""))
                assigned[j] = True

        best = max(cluster_items_list, key=lambda x: len(x.get("summary", "")))

        clusters.append({
            "representative": best,
            "all_items": cluster_items_list,
            "feed_ids": cluster_feeds,
            "source_names": sorted(cluster_sources - {""}),
            "source_count": len(cluster_sources - {""}),
        })

    return clusters


def _recency_points(date_str: str) -> int:
    parsed = _parse_date_rough(date_str)
    if not parsed:
        return 3
    hours_ago = (datetime.now(timezone.utc) - parsed).total_seconds() / 3600
    if hours_ago < 6:
        return 25
    if hours_ago < 24:
        return 18
    if hours_ago < 48:
        return 10
    return 3


def _tier_points(feed_id: str) -> int:
    feed = FEED_MAP.get(feed_id)
    if not feed:
        return 5
    cat = str(feed.get("category", ""))
    if cat == "worldwide-tier1":
        return 15
    if cat == "worldwide-tier2":
        return 8
    return 5


def _source_coverage_points(count: int) -> int:
    if count <= 1:
        return 5
    if count == 2:
        return 15
    if count == 3:
        return 25
    return min(35 + (count - 4) * 5, 40)


def _summary_quality_points(summary: str) -> int:
    text = summary.strip()
    if not text:
        return 0
    if len(text) > 200:
        return 10
    return 5


def _keyword_density_points(text: str) -> int:
    lower = text.lower()
    hits = sum(1 for kw in AI_KEYWORDS if kw in lower)
    if hits >= 5:
        return 10
    if hits >= 3:
        return 7
    if hits >= 1:
        return 4
    return 0


def _absolute_score(item: dict[str, str], source_count: int) -> int:
    score = (
        _source_coverage_points(source_count)
        + _recency_points(item.get("date", ""))
        + _tier_points(item.get("feed_id", ""))
        + _summary_quality_points(item.get("summary", ""))
        + _keyword_density_points(item.get("title", "") + " " + item.get("summary", ""))
    )
    return max(1, min(score, 100))


def score_all_items(items: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Cluster items and assign each an absolute relevance score (1-100).

    Every item in the input list is returned with added keys:
    relevance_score, source_count, covered_by.
    """
    clusters = cluster_items(items)

    source_count_map: dict[str, int] = {}
    covered_by_map: dict[str, list[str]] = {}
    for cluster in clusters:
        count = cluster["source_count"]
        names = cluster["source_names"]
        for ci in cluster["all_items"]:
            key = ci.get("source_url", "")
            source_count_map[key] = count
            covered_by_map[key] = names

    scored: list[dict[str, Any]] = []
    for item in items:
        url = item.get("source_url", "")
        count = source_count_map.get(url, 1)
        scored.append({
            **item,
            "relevance_score": _absolute_score(item, count),
            "source_count": count,
            "covered_by": covered_by_map.get(url, [item.get("source_name", "")]),
        })

    return scored


def score_clusters(clusters: list[dict[str, Any]]) -> list[dict[str, Any]]:
    scored: list[dict[str, Any]] = []

    for cluster in clusters:
        rep = cluster["representative"]
        count = cluster["source_count"]

        sw = _source_weight(count)
        tier_weights = [_tier_weight(fid) for fid in cluster["feed_ids"] if fid]
        avg_tier = sum(tier_weights) / len(tier_weights) if tier_weights else 1.0
        recency = _recency_multiplier(rep.get("date", ""))
        summary_bonus = 0.2 if rep.get("summary", "").strip() else 0.0

        raw_score = sw * avg_tier * recency + summary_bonus

        scored.append({
            **cluster,
            "raw_score": raw_score,
        })

    scored.sort(key=lambda x: x["raw_score"], reverse=True)
    return scored


def _normalize_scores(scored: list[dict[str, Any]], limit: int = 15) -> list[dict[str, Any]]:
    top = scored[:limit]
    if not top:
        return []
    max_score = top[0]["raw_score"] if top[0]["raw_score"] > 0 else 1.0

    result: list[dict[str, Any]] = []
    for cluster in top:
        rep = cluster["representative"]
        norm = int(round((cluster["raw_score"] / max_score) * 100))
        result.append({
            "title": rep.get("title", ""),
            "date": rep.get("date", ""),
            "summary": rep.get("summary", ""),
            "source_url": rep.get("source_url", ""),
            "source_name": rep.get("source_name", ""),
            "feed_id": rep.get("feed_id", ""),
            "relevance_score": max(norm, 1),
            "covered_by": cluster["source_names"],
            "source_count": cluster["source_count"],
        })

    return result


async def get_recommendations(
    feed_ids: list[str] | None = None,
) -> list[dict[str, Any]]:
    cache_key = ",".join(sorted(feed_ids)) if feed_ids else "__default__"
    cached = _recommend_cache.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL:
        return cached["items"]

    items = await fetch_news(feed_ids)
    clusters = cluster_items(items)
    scored = score_clusters(clusters)
    result = _normalize_scores(scored)

    _recommend_cache[cache_key] = {"items": result, "ts": time.time()}
    return result
