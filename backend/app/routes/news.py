import base64
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from groq import APIStatusError, AuthenticationError

from ..schemas import (
    DigestRequest,
    DigestResponse,
    FeedSource,
    NewsItem,
    NewsResponse,
    RecommendedItem,
    RecommendationsResponse,
)
from ..services.extract_article import fetch_article
from ..services.feed_registry import get_all_feeds
from ..services.news import clear_cache, fetch_news, get_fetched_at
from ..services.recommend import clear_recommend_cache, get_recommendations, score_all_items
from ..services.summarize import summarize_content
from ..services.tts import synthesize_speech

router = APIRouter(prefix="/news", tags=["news"])

_GROQ_AUTH_HINT = (
    "Groq rejected this API key (invalid or revoked). "
    "Create a key at https://console.groq.com/keys. "
    "Put it in backend/.env as GROQ_API_KEY=gsk_..."
)


@router.get("/feeds", response_model=list[FeedSource])
async def list_feeds() -> list[FeedSource]:
    return [FeedSource(**f) for f in get_all_feeds()]


@router.get("", response_model=NewsResponse)
async def get_news(
    feeds: Optional[str] = Query(None, description="Comma-separated feed IDs"),
    force_refresh: bool = Query(False, description="Bust the backend cache"),
) -> NewsResponse:
    feed_ids = [fid.strip() for fid in feeds.split(",") if fid.strip()] if feeds else None
    if force_refresh:
        clear_cache(feed_ids)
        clear_recommend_cache(feed_ids)
    try:
        raw_items = await fetch_news(feed_ids)
        scored_items = score_all_items(raw_items)
        return NewsResponse(
            items=[NewsItem(**item) for item in scored_items],
            fetched_at=get_fetched_at(),
        )
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/recommended", response_model=RecommendationsResponse)
async def get_recommended(
    feeds: Optional[str] = Query(None, description="Comma-separated feed IDs"),
    force_refresh: bool = Query(False, description="Bust the backend cache"),
) -> RecommendationsResponse:
    feed_ids = [fid.strip() for fid in feeds.split(",") if fid.strip()] if feeds else None
    if force_refresh:
        clear_cache(feed_ids)
        clear_recommend_cache(feed_ids)
    try:
        items = await get_recommendations(feed_ids)
        return RecommendationsResponse(
            items=[RecommendedItem(**item) for item in items],
            fetched_at=get_fetched_at(),
        )
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/digest", response_model=DigestResponse)
async def generate_digest(payload: DigestRequest) -> DigestResponse:
    if not payload.urls:
        raise HTTPException(status_code=400, detail="No URLs provided")
    if len(payload.urls) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 URLs per digest")

    extracted_texts: list[str] = []
    for url in payload.urls:
        try:
            content, title = await fetch_article(url)
            extracted_texts.append(f"## {title}\n\n{content}")
        except Exception:
            extracted_texts.append(f"## {url}\n\n[Could not extract content from this URL]")

    combined = "\n\n---\n\n".join(extracted_texts)

    try:
        summary = await summarize_content(
            combined,
            "article",
            payload.audioStyle,
            focus_prompt="Create a news digest covering all these articles. Summarize each briefly then highlight overarching themes.",
            title="AI News Digest",
            output_length=payload.outputLength,
        )
    except AuthenticationError as err:
        raise HTTPException(status_code=502, detail=_GROQ_AUTH_HINT) from err
    except APIStatusError as err:
        if err.status_code == 401:
            raise HTTPException(status_code=502, detail=_GROQ_AUTH_HINT) from err
        raise HTTPException(status_code=500, detail=str(err)) from err

    try:
        audio = await synthesize_speech(summary)
        audio_b64 = base64.b64encode(audio).decode("utf-8")
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"TTS failed: {err}")

    return DigestResponse(audioBase64=audio_b64, summary=summary)
