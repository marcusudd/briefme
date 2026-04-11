import re

from ..schemas import SourceType


def detect_source_type(url: str) -> SourceType:
    if re.search(r"youtube\.com|youtu\.be", url, re.IGNORECASE):
        return "youtube"
    return "article"
