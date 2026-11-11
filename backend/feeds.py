"""The source catalog. All endpoints are free and need no API key.

text_from:
  "page"  -> download the linked article and extract its text (falls back to the entry body)
  "entry" -> use the text inside the feed entry itself (Reddit posts, arXiv abstracts,
             GitHub release notes), because the linked page scrapes badly

Set enabled=False to switch a source off. Run `python check_feeds.py` to see which are alive.

Sources built with hub() have no feed of their own and go through an RSSHub bridge. The
public rsshub.app blocks automated requests, so they stay off until RSSHUB_BASE points
at your own RSSHub instance.
"""
from dataclasses import dataclass
from typing import List

import config


@dataclass(frozen=True)
class Feed:
    label: str
    url: str
    group: str
    interval_min: int
    text_from: str = "page"
    enabled: bool = True
    note: str = ""


def hub(label: str, route: str, group: str, interval_min: int, text_from: str = "page", note: str = "") -> Feed:
    """A source that only exists as an RSSHub route. On only when RSSHUB_BASE is set."""
    base = config.RSSHUB_BASE or "https://rsshub.app"
    needs = "Needs RSSHUB_BASE (your own RSSHub instance)."
    return Feed(label, base + route, group, interval_min, text_from,
                enabled=bool(config.RSSHUB_BASE), note=f"{needs} {note}".strip())


def x_user(handle: str) -> Feed:
    return hub(f"X @{handle}", f"/twitter/user/{handle}", "Key Figures (X)", 60, "entry",
               note="The RSSHub instance also needs X login cookies. Posts under 200 characters are skipped.")


FEEDS: List[Feed] = [
    # Frontier labs
    Feed("OpenAI", "https://openai.com/news/rss.xml", "Frontier Labs", 15),
    Feed("Google AI", "https://blog.google/innovation-and-ai/technology/ai/rss/", "Frontier Labs", 15),
    Feed("Google DeepMind", "https://deepmind.google/blog/rss.xml", "Frontier Labs", 30),
    hub("Anthropic", "/anthropic/news", "Frontier Labs", 15, note="Anthropic has no official RSS."),
    Feed("Meta AI", "https://ai.meta.com/blog/rss/", "Frontier Labs", 30, enabled=False,
         note="404: Meta AI publishes no RSS feed."),
    Feed("Mistral AI", "https://mistral.ai/rss.xml", "Frontier Labs", 30,
         note="Spec URL /news/index.xml is 404; this is the live feed."),
    # Chinese labs
    Feed("DeepSeek", "https://github.com/deepseek-ai/DeepSeek-V3/releases.atom", "Chinese Labs", 15, "entry"),
    Feed("Qwen", "https://github.com/QwenLM/qwen-code/releases.atom", "Chinese Labs", 60, "entry",
         note="The model repos publish no releases; this is the Qwen Code tool, the only Qwen repo with a live feed."),
    Feed("Moonshot AI (Kimi)", "https://github.com/MoonshotAI/kimi-cli/releases.atom", "Chinese Labs", 60, "entry",
         note="GitHub has no feed for a whole organisation; this is Moonshot's most active repo."),
    Feed("01.AI (Yi)", "https://github.com/01-ai/Yi/releases.atom", "Chinese Labs", 360, "entry", enabled=False,
         note="Only one release, from December 2023."),
    Feed("Zhipu AI (GLM)", "https://github.com/zai-org/GLM-4.5/releases.atom", "Chinese Labs", 360, "entry",
         enabled=False, note="THUDM moved to zai-org; its model repos publish no GitHub releases."),
    Feed("Kling AI (via Pandaily)", "https://pandaily.com/tag/kling/feed/", "Chinese Labs", 360),
    hub("36Kr Newsflashes", "/36kr/newsflashes", "Chinese Labs", 60, "entry"),
    Feed("Pandaily", "https://pandaily.com/feed/", "Chinese Labs", 60,
         note="Spec URL /category/tech/feed/ is 404; this is the site-wide feed."),
    # Hardware
    Feed("NVIDIA Developer", "https://developer.nvidia.com/blog/feed/", "Hardware", 30),
    Feed("SemiAnalysis", "https://newsletter.semianalysis.com/feed", "Hardware", 60,
         note="Spec URL stopped updating in Sep 2025; the newsletter feed is current."),
    Feed("ServeTheHome", "https://www.servethehome.com/feed/", "Hardware", 30),
    Feed("Tom's Hardware", "https://www.tomshardware.com/feeds/all", "Hardware", 60,
         note="Site-wide feed; non-AI stories are filtered out."),
    # Developer tools and changelogs
    Feed("GitHub Copilot Changelog", "https://github.blog/changelog/label/copilot/feed/", "Developer Tools", 60),
    Feed("Ollama Releases", "https://github.com/ollama/ollama/releases.atom", "Developer Tools", 60, "entry"),
    Feed("vLLM Releases", "https://github.com/vllm-project/vllm/releases.atom", "Developer Tools", 60, "entry"),
    Feed("Cursor Releases", "https://github.com/getcursor/cursor/releases.atom", "Developer Tools", 360, "entry",
         enabled=False, note="The repo publishes no GitHub releases, so the feed is always empty."),
    # Open source and community
    Feed("Hugging Face Blog", "https://huggingface.co/blog/feed.xml", "Open Source", 15),
    Feed("r/LocalLLaMA", "https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day", "Community", 30, "entry"),
    Feed("r/StableDiffusion", "https://www.reddit.com/r/StableDiffusion/top/.rss?t=day", "Community", 30, "entry"),
    hub("GitHub Trending", "/github/trending/daily/any", "Community", 360, "entry"),
    Feed("Midjourney (Discord)", "https://rsshub.app/discord/channel/GUILD_ID/CHANNEL_ID", "Community", 60, "entry",
         enabled=False,
         note="Needs your own RSSHub with a Discord token, and the real server and channel numbers in this address."),
    # Key figures on X
    x_user("_akhaliq"),
    x_user("karpathy"),
    x_user("sama"),
    x_user("ylecun"),
    x_user("swyx"),
    x_user("bindureddy"),
    # Academic
    Feed(
        "arXiv cs.AI",
        "http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=20",
        "Academic",
        360,
        "entry",
    ),
    Feed(
        "arXiv cs.CL",
        "http://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=20",
        "Academic",
        360,
        "entry",
    ),
    # Startups and venture
    Feed("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/", "Startups & VC", 30),
    Feed("VentureBeat AI", "https://venturebeat.com/category/ai/feed/", "Startups & VC", 30),
    Feed("Product Hunt AI", "https://www.producthunt.com/feed?category=artificial-intelligence", "Startups & VC", 60,
         "entry"),
    # Vertical industries
    Feed("Nature Machine Intelligence", "https://www.nature.com/natmachintell.rss", "Healthcare & Science", 360),
    Feed("bioRxiv Bioinformatics", "http://connect.biorxiv.org/biorxiv_xml.php?subject=bioinformatics",
         "Healthcare & Science", 360, "entry"),
    Feed("Runway", "https://runwayml.com/blog/rss.xml", "Creative Media", 360),
    Feed("80 Level", "https://80.lv/feed/", "Creative Media", 60,
         note="Site-wide feed; non-AI stories are filtered out."),
    Feed("AgFunder News", "https://agfundernews.com/feed", "Agriculture & Climate", 60,
         note="Site-wide feed; non-AI stories are filtered out."),
    Feed("IEEE Spectrum Robotics", "https://spectrum.ieee.org/feeds/topic/robotics.rss", "Space & Robotics", 60),
    Feed("NASA JPL", "https://www.jpl.nasa.gov/feeds/news/", "Space & Robotics", 360,
         note="Site-wide feed; non-AI stories are filtered out."),
    # Regional
    Feed("Inc42", "https://inc42.com/feed/", "Regional (IN)", 60,
         note="Spec URL /buzz/ai/feed/ is 404; this is the site-wide feed, non-AI stories are filtered out."),
    Feed("Sarvam AI (via Inc42)", "https://inc42.com/buzz/sarvam-ai/feed/", "Regional (IN)", 360),
    Feed("Qure.ai (via Inc42)", "https://inc42.com/buzz/qure-ai/feed/", "Regional (IN)", 360),
    Feed("Entrackr", "https://entrackr.com/feed/", "Regional (IN)", 60,
         note="Site-wide feed; non-AI stories are filtered out."),
    Feed("Krutrim (via Entrackr)", "https://entrackr.com/tag/krutrim/feed/", "Regional (IN)", 360),
]

ENABLED_FEEDS = [f for f in FEEDS if f.enabled]
