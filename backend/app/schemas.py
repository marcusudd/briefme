from typing import Literal, Optional

from pydantic import BaseModel


SourceType = Literal["youtube", "article", "file"]
AudioStyle = Literal["summary", "podcast"]
OutputLength = Literal["min", "med", "max"]
DetailLevel = Literal["essentials", "detailed", "thorough"]


class ExtractRequest(BaseModel):
    url: str


class ExtractResponse(BaseModel):
    content: str
    title: str
    sourceType: SourceType


class SummarizeRequest(BaseModel):
    content: str
    sourceType: SourceType
    focusPrompt: Optional[str] = None
    title: Optional[str] = None
    audioStyle: AudioStyle = "summary"
    outputLength: OutputLength = "med"
    detailLevel: DetailLevel = "detailed"


class SummarizeResponse(BaseModel):
    summary: str


class TTSRequest(BaseModel):
    text: str
    audioStyle: AudioStyle = "summary"


class TTSResponse(BaseModel):
    audioBase64: str


# --- News feed models ---


class FeedSource(BaseModel):
    id: str
    name: str
    url: str
    type: str
    category: str
    enabled_by_default: bool


class NewsItem(BaseModel):
    title: str
    date: str
    summary: str
    source_url: str
    source_name: str
    feed_id: str
    relevance_score: int = 0
    source_count: int = 1
    covered_by: list[str] = []


class NewsResponse(BaseModel):
    items: list[NewsItem]
    fetched_at: str


class RecommendedItem(BaseModel):
    title: str
    date: str
    summary: str
    source_url: str
    source_name: str
    feed_id: str
    relevance_score: int
    covered_by: list[str]
    source_count: int


class RecommendationsResponse(BaseModel):
    items: list[RecommendedItem]
    fetched_at: str


class DigestRequest(BaseModel):
    urls: list[str]
    audioStyle: AudioStyle = "summary"
    outputLength: OutputLength = "med"


class DigestResponse(BaseModel):
    audioBase64: str
    summary: str
