from typing import Literal, Optional

from pydantic import BaseModel


SourceType = Literal["youtube", "article", "file"]
AudioStyle = Literal["summary", "podcast"]
OutputLength = Literal["min", "med", "max"]


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


class SummarizeResponse(BaseModel):
    summary: str


class TTSRequest(BaseModel):
    text: str
    audioStyle: AudioStyle = "summary"


class TTSResponse(BaseModel):
    audioBase64: str
