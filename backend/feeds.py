"""The source catalog. All endpoints are free and need no API key.

text_from:
  "page"  -> download the linked article and extract its text (falls back to the entry body)
  "entry" -> use the text inside the feed entry itself (Reddit posts, arXiv abstracts,
             GitHub release notes), because the linked page scrapes badly

Set enabled=False to switch a source off. Run `python check_feeds.py` to see which are alive.
"""
from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Feed:
    label: str
    url: str
    group: str
    interval_min: int
    text_from: str = "page"
    enabled: bool = True
    note: str = ""


FEEDS: List[Feed] = [
    # Frontier labs
    Feed("OpenAI", "https://openai.com/news/rss.xml", "Frontier Labs", 15),
    Feed("Google AI", "https://blog.google/innovation-and-ai/technology/ai/rss/", "Frontier Labs", 15),
    Feed("Anthropic", "https://rsshub.app/anthropic/news", "Frontier Labs", 15, enabled=False,
         note="Public RSSHub returns 403 and Anthropic has no official RSS. Needs a self-hosted RSSHub."),
    Feed("Meta AI", "https://ai.meta.com/blog/rss/", "Frontier Labs", 30, enabled=False,
         note="404: Meta AI publishes no RSS feed."),
    Feed("Mistral AI", "https://mistral.ai/rss.xml", "Frontier Labs", 30,
         note="Spec URL /news/index.xml is 404; this is the live feed."),
    # Chinese labs
    Feed("DeepSeek", "https://github.com/deepseek-ai/DeepSeek-V3/releases.atom", "Chinese Labs", 15, "entry"),
    Feed("Qwen", "https://github.com/QwenLM/Qwen2.5/releases.atom", "Chinese Labs", 15, "entry", enabled=False,
         note="Repo publishes no GitHub releases, so the feed is always empty."),
    Feed("Pandaily", "https://pandaily.com/feed/", "Chinese Labs", 60,
         note="Spec URL /category/tech/feed/ is 404; this is the site-wide feed."),
    # Hardware
    Feed("NVIDIA Developer", "https://developer.nvidia.com/blog/feed/", "Hardware", 30),
    Feed("SemiAnalysis", "https://newsletter.semianalysis.com/feed", "Hardware", 60,
         note="Spec URL stopped updating in Sep 2025; the newsletter feed is current."),
    Feed("ServeTheHome", "https://www.servethehome.com/feed/", "Hardware", 30),
    # Open source and community
    Feed("Hugging Face Blog", "https://huggingface.co/blog/feed.xml", "Open Source", 15),
    Feed("r/LocalLLaMA", "https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day", "Community", 30, "entry"),
    Feed("r/StableDiffusion", "https://www.reddit.com/r/StableDiffusion/top/.rss?t=day", "Community", 30, "entry"),
    # Academic
    Feed(
        "arXiv cs.AI",
        "http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=20",
        "Academic",
        360,
        "entry",
    ),
    # Regional
    Feed("Inc42", "https://inc42.com/feed/", "Regional (IN)", 60,
         note="Spec URL /buzz/ai/feed/ is 404; this is the site-wide feed, non-AI stories are filtered out."),
]

ENABLED_FEEDS = [f for f in FEEDS if f.enabled]
