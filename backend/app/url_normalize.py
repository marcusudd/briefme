import re
from urllib.parse import urlparse


def normalize_fetch_url(raw: str) -> str:
    """Accept bare domains, arXiv IDs, and missing schemes for article/video fetch."""
    u = (raw or "").strip()
    if not u:
        raise ValueError("URL is empty. Paste a full link or an arXiv id such as 1706.03762v7.")

    u = u.split()[0]

    if re.fullmatch(r"\d{4}\.\d{4,5}(v\d+)?", u, re.IGNORECASE):
        return f"https://arxiv.org/abs/{u}"

    if re.match(r"^arxiv\.org/(abs|pdf)/", u, re.IGNORECASE):
        u = "https://" + u if not re.match(r"^https?://", u, re.IGNORECASE) else u
        return u

    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", u):
        u = "https://" + u

    parsed = urlparse(u)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are supported.")
    if not parsed.netloc:
        raise ValueError(
            "That does not look like a valid URL. Include a domain (e.g. https://example.com/article)."
        )

    return u
