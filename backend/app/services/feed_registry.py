from __future__ import annotations

FEED_REGISTRY: list[dict[str, str | bool]] = [
    # --- Worldwide Tier 1 ---
    {
        "id": "openai-blog",
        "name": "OpenAI Blog",
        "url": "https://openai.com/news/rss.xml",
        "type": "rss",
        "category": "worldwide-tier1",
        "enabled_by_default": True,
    },
    {
        "id": "deepmind",
        "name": "Google DeepMind",
        "url": "https://deepmind.com/blog/feed/basic/",
        "type": "rss",
        "category": "worldwide-tier1",
        "enabled_by_default": True,
    },
    {
        "id": "google-ai",
        "name": "Google AI Blog",
        "url": "https://blog.google/technology/ai/rss/",
        "type": "rss",
        "category": "worldwide-tier1",
        "enabled_by_default": True,
    },
    {
        "id": "huggingface",
        "name": "Hugging Face Blog",
        "url": "https://huggingface.co/blog/feed.xml",
        "type": "rss",
        "category": "worldwide-tier1",
        "enabled_by_default": True,
    },
    {
        "id": "mit-tech-review",
        "name": "MIT Technology Review (AI)",
        "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
        "type": "rss",
        "category": "worldwide-tier1",
        "enabled_by_default": True,
    },
    {
        "id": "tldr-ai",
        "name": "TLDR AI",
        "url": "https://tldr.tech/api/rss/ai",
        "type": "rss",
        "category": "worldwide-tier1",
        "enabled_by_default": True,
    },
    {
        "id": "techcrunch-ai",
        "name": "TechCrunch AI",
        "url": "https://techcrunch.com/category/artificial-intelligence/feed/",
        "type": "rss",
        "category": "worldwide-tier1",
        "enabled_by_default": True,
    },
    {
        "id": "the-verge-ai",
        "name": "The Verge AI",
        "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
        "type": "rss",
        "category": "worldwide-tier1",
        "enabled_by_default": True,
    },
    # --- Worldwide Tier 2 ---
    {
        "id": "ars-technica",
        "name": "Ars Technica",
        "url": "https://feeds.arstechnica.com/arstechnica/technology-lab",
        "type": "rss",
        "category": "worldwide-tier2",
        "enabled_by_default": False,
    },
    {
        "id": "marktechpost",
        "name": "MarkTechPost",
        "url": "https://www.marktechpost.com/feed/",
        "type": "rss",
        "category": "worldwide-tier2",
        "enabled_by_default": False,
    },
    {
        "id": "arxiv-cs-ai",
        "name": "arXiv cs.AI",
        "url": "https://rss.arxiv.org/rss/cs.AI",
        "type": "rss",
        "category": "worldwide-tier2",
        "enabled_by_default": False,
    },
    {
        "id": "arxiv-cs-lg",
        "name": "arXiv cs.LG",
        "url": "https://rss.arxiv.org/rss/cs.LG",
        "type": "rss",
        "category": "worldwide-tier2",
        "enabled_by_default": False,
    },
    {
        "id": "bair-blog",
        "name": "BAIR Blog",
        "url": "https://bair.berkeley.edu/blog/feed.xml",
        "type": "rss",
        "category": "worldwide-tier2",
        "enabled_by_default": False,
    },
    {
        "id": "google-research",
        "name": "Google Research",
        "url": "https://research.google/blog/rss/",
        "type": "rss",
        "category": "worldwide-tier2",
        "enabled_by_default": False,
    },
    {
        "id": "simon-willison",
        "name": "Simon Willison",
        "url": "https://simonwillison.net/atom/everything/",
        "type": "rss",
        "category": "worldwide-tier2",
        "enabled_by_default": False,
    },
    {
        "id": "hackernews-ai",
        "name": "Hacker News (AI, 100+ pts)",
        "url": "https://hnrss.org/frontpage?q=AI&points=100",
        "type": "rss",
        "category": "worldwide-tier2",
        "enabled_by_default": False,
    },
    # --- Scraped (no RSS) ---
    {
        "id": "crescendo-ai",
        "name": "Crescendo AI News",
        "url": "https://www.crescendo.ai/news/latest-ai-news-and-updates",
        "type": "scrape",
        "category": "worldwide-tier1",
        "enabled_by_default": True,
    },
    {
        "id": "anthropic-news",
        "name": "Anthropic News",
        "url": "https://www.anthropic.com/news",
        "type": "scrape",
        "category": "worldwide-tier2",
        "enabled_by_default": False,
    },
    # --- Sweden ---
    {
        "id": "computer-sweden",
        "name": "Computer Sweden",
        "url": "https://computersweden.se/feed/",
        "type": "rss",
        "category": "sweden",
        "enabled_by_default": True,
    },
    {
        "id": "ai-sweden",
        "name": "AI Sweden",
        "url": "https://www.ai.se/en/news",
        "type": "scrape",
        "category": "sweden",
        "enabled_by_default": True,
    },
    {
        "id": "sweden-gov-ai",
        "name": "Swedish Government AI",
        "url": "https://www.government.se/press-releases/",
        "type": "scrape",
        "category": "sweden",
        "enabled_by_default": True,
    },
]

FEED_MAP: dict[str, dict[str, str | bool]] = {f["id"]: f for f in FEED_REGISTRY}

AI_KEYWORDS: list[str] = [
    "ai",
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "neural network",
    "llm",
    "large language model",
    "gpt",
    "generative ai",
    "artificiell intelligens",
    "maskininlärning",
]


def get_feed_by_id(feed_id: str) -> dict[str, str | bool] | None:
    return FEED_MAP.get(feed_id)


def get_all_feeds() -> list[dict[str, str | bool]]:
    return FEED_REGISTRY


def get_default_feed_ids() -> list[str]:
    return [f["id"] for f in FEED_REGISTRY if f["enabled_by_default"]]
