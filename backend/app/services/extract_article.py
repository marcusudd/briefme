import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from readability import Document


async def fetch_article(url: str) -> tuple[str, str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        res = await client.get(url, headers=headers)
    if res.status_code != 200:
        raise ValueError(f"Failed to fetch article (HTTP {res.status_code}): {url}")

    doc = Document(res.text)
    article_html = doc.summary()
    soup = BeautifulSoup(article_html, "html.parser")
    text = soup.get_text(" ", strip=True)
    content = re.sub(r"\s+", " ", text).strip()

    if not content:
        raise ValueError(
            "Could not extract readable content from this page. "
            "The site may require a login or block automated access."
        )

    title = (doc.short_title() or "").strip() or urlparse(url).hostname or url
    return content, title
