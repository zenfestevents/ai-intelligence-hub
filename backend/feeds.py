"""The source catalog. All endpoints are free and need no API key.

text_from:
  "page"  -> download the linked article and extract its text (falls back to the entry body)
  "entry" -> use the text inside the feed entry itself (Reddit posts, arXiv abstracts,
             GitHub release notes), because the linked page scrapes badly

kind:
  "rss"       -> RSS or Atom feed (default)
  "hf_models" -> Hugging Face models JSON API (see sources.py)
  "hn"        -> Hacker News search JSON API (see sources.py)

Set enabled=False to switch a source off. Run `python check_feeds.py` to see which are alive.
"""
import os
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
    kind: str = "rss"


# X (Twitter) accounts, read by x_ingest.py through Apify (X has no free feed).
X_HANDLES = ["_akhaliq", "karpathy", "sama", "ylecun", "swyx", "bindureddy", "RowanCheung", "levelsio"]

# Base address of your self-hosted RSSHub (see rsshub/README.md). Empty = RSSHub sources stay off.
RSSHUB_URL = os.getenv("RSSHUB_URL", "").strip().rstrip("/")

FEEDS: List[Feed] = [
    # Frontier labs and official changelogs
    Feed("OpenAI", "https://openai.com/news/rss.xml", "Frontier Labs", 15),
    Feed("OpenAI Engineering", "https://openai.com/news/engineering/rss.xml", "Frontier Labs", 30, enabled=False,
         note="403: blocked for automated requests."),
    Feed("OpenAI Release Notes", "https://openai.com/products/release-notes/rss.xml", "Frontier Labs", 30, enabled=False,
         note="403: blocked for automated requests."),
    Feed("Google DeepMind", "https://deepmind.google/blog/feed/basic/", "Frontier Labs", 30),
    Feed("Google AI", "https://blog.google/innovation-and-ai/technology/ai/rss/", "Frontier Labs", 15),
    Feed("Anthropic", "https://rsshub.app/anthropic/news", "Frontier Labs", 15, enabled=False,
         note="Public RSSHub returns 403; the Turing Institute mirror stopped updating in 2023. Needs a self-hosted RSSHub."),
    Feed("Meta AI", "https://ai.meta.com/blog/rss/", "Frontier Labs", 30, enabled=False,
         note="404: Meta AI publishes no RSS feed."),
    Feed("Mistral AI", "https://mistral.ai/rss.xml", "Frontier Labs", 30,
         note="Spec URL /news/index.xml is 404; this is the live feed."),
    Feed("Microsoft Research", "https://www.microsoft.com/en-us/research/feed/", "Frontier Labs", 60),
    Feed("Apple ML Research", "https://machinelearning.apple.com/rss.xml", "Frontier Labs", 60),
    Feed("AWS Machine Learning", "https://aws.amazon.com/blogs/amazon-ai/feed/", "Frontier Labs", 60),
    Feed("Berkeley BAIR", "https://bair.berkeley.edu/blog/feed.xml", "Frontier Labs", 120),
    Feed("Cohere", "https://raw.githubusercontent.com/alan-turing-institute/ai-rss-feeds/main/feeds/cohere-blog.xml",
         "Frontier Labs", 120, note="Third-party mirror; can lag behind the official blog."),
    Feed("Allen Institute (Ai2)", "https://raw.githubusercontent.com/alan-turing-institute/ai-rss-feeds/main/feeds/allenai-news.xml",
         "Frontier Labs", 120, note="Third-party mirror; can lag behind the official blog."),
    # Chinese labs and open weights
    Feed("DeepSeek", "https://github.com/deepseek-ai/DeepSeek-V3/releases.atom", "Chinese Labs", 15, "entry"),
    Feed("DeepSeek Models (HF)", "https://huggingface.co/api/models?author=deepseek-ai&sort=lastModified&direction=-1&limit=10",
         "Chinese Labs", 60, kind="hf_models", note="Sorted by last update so new releases come first."),
    Feed("Qwen", "https://github.com/QwenLM/Qwen2.5/releases.atom", "Chinese Labs", 15, "entry", enabled=False,
         note="Repo publishes no GitHub releases, so the feed is always empty. Covered by Qwen Models (HF)."),
    Feed("Qwen Models (HF)", "https://huggingface.co/api/models?author=Qwen&sort=lastModified&direction=-1&limit=10",
         "Chinese Labs", 60, kind="hf_models"),
    Feed("Moonshot Kimi Models (HF)", "https://huggingface.co/api/models?author=moonshotai&sort=lastModified&direction=-1&limit=10",
         "Chinese Labs", 60, kind="hf_models", note="Replaces the RSSHub GitHub feed (RSSHub returns 403)."),
    Feed("Zhipu GLM Models (HF)", "https://huggingface.co/api/models?author=zai-org&sort=lastModified&direction=-1&limit=10",
         "Chinese Labs", 60, kind="hf_models", note="Replaces the RSSHub GitHub feed (RSSHub returns 403)."),
    Feed("01.AI Yi Models (HF)", "https://huggingface.co/api/models?author=01-ai&sort=lastModified&direction=-1&limit=10",
         "Chinese Labs", 120, kind="hf_models", note="Replaces the RSSHub GitHub feed (RSSHub returns 403)."),
    Feed("Pandaily", "https://pandaily.com/feed/", "Chinese Labs", 60,
         note="Spec URL /category/tech/feed/ is 404; this is the site-wide feed."),
    Feed("36Kr Newsflashes", "https://rsshub.app/36kr/newsflashes", "Chinese Labs", 60, enabled=False,
         note="Public RSSHub returns 403."),
    # Open source, tools and developer changelogs
    Feed("Hugging Face Blog", "https://huggingface.co/blog/feed.xml", "Open Source", 15),
    Feed("Hugging Face Top Models", "https://huggingface.co/api/models?sort=downloads&direction=-1&limit=25",
         "Open Source", 360, kind="hf_models", enabled=False,
         note="Disabled: the all-time most downloaded models are years old (2022), so they are not news."),
    Feed("GitHub Trending", "https://rsshub.app/github/trending/daily/any/all", "Open Source", 60, enabled=False,
         note="Public RSSHub returns 403."),
    Feed("GitHub Copilot Changelog", "https://github.blog/changelog/label/copilot/feed/", "Open Source", 30),
    Feed("Cursor Changelog", "https://cursor.com/changelog/rss.xml", "Open Source", 60,
         note="Official changelog feed; replaces the RSSHub GitHub releases route (403)."),
    Feed("Ollama", "https://github.com/ollama/ollama/releases.atom", "Open Source", 60, "entry"),
    Feed("vLLM", "https://github.com/vllm-project/vllm/releases.atom", "Open Source", 60, "entry"),
    Feed("LangChain", "https://blog.langchain.dev/rss/", "Open Source", 60, enabled=False,
         note="Feed returns no entries (blog moved to blog.langchain.com, also empty)."),
    Feed("LlamaIndex", "https://www.llamaindex.ai/blog/rss.xml", "Open Source", 60, enabled=False,
         note="404: no RSS feed found."),
    Feed("Simon Willison", "https://simonwillison.net/atom/everything/", "Open Source", 60),
    # X / Twitter: RSSHub's public Twitter route is closed
    # The 8 X accounts in X_HANDLES are fetched by x_ingest.py (Apify), not as feeds here.
    # Sources that need a self-hosted RSSHub route. On only when RSSHUB_URL is set.
    Feed("Anthropic News (RSSHub)", RSSHUB_URL + "/anthropic/news", "Frontier Labs", 30, enabled=bool(RSSHUB_URL),
         note="Needs the self-hosted RSSHub."),
    Feed("36Kr Newsflashes (RSSHub)", RSSHUB_URL + "/36kr/newsflashes", "Chinese Labs", 60, enabled=bool(RSSHUB_URL),
         note="Needs the self-hosted RSSHub."),
    Feed("GitHub Trending (RSSHub)", RSSHUB_URL + "/github/trending/daily/any/all", "Open Source", 60, enabled=bool(RSSHUB_URL),
         note="Needs the self-hosted RSSHub."),
    # Community and launch hubs
    Feed("r/LocalLLaMA", "https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day", "Community", 30, "entry", enabled=False,
         note="Disabled: Reddit requires approval for API access (Responsible Builder Policy). Access request pending."),
    Feed("r/StableDiffusion", "https://www.reddit.com/r/StableDiffusion/top/.rss?t=day", "Community", 30, "entry", enabled=False,
         note="Disabled: Reddit requires approval for API access (Responsible Builder Policy). Access request pending."),
    Feed("r/AI_Agents", "https://www.reddit.com/r/AI_Agents/top/.rss?t=day", "Community", 30, "entry", enabled=False,
         note="Disabled: Reddit requires approval for API access (Responsible Builder Policy). Access request pending."),
    Feed("r/MachineLearning", "https://www.reddit.com/r/MachineLearning/top/.rss?t=day", "Community", 30, "entry", enabled=False,
         note="Disabled: Reddit requires approval for API access (Responsible Builder Policy). Access request pending."),
    Feed("Product Hunt AI", "https://www.producthunt.com/feed?category=artificial-intelligence", "Community", 60),
    # Hardware
    Feed("NVIDIA Developer", "https://developer.nvidia.com/blog/feed/", "Hardware", 30),
    Feed("SemiAnalysis", "https://newsletter.semianalysis.com/feed", "Hardware", 60,
         note="The www.semianalysis.com/feed URL stopped updating in Sep 2025; the newsletter feed is current."),
    Feed("ServeTheHome", "https://www.servethehome.com/feed/", "Hardware", 30),
    Feed("Tom's Hardware", "https://www.tomshardware.com/feeds/all", "Hardware", 30),
    Feed("AnandTech", "https://www.anandtech.com/rss/", "Hardware", 60, enabled=False,
         note="Feed returns no entries (site stopped publishing)."),
    # Academic and newsletters
    Feed(
        "arXiv cs.AI",
        "http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=20",
        "Academic", 360, "entry", note="Uses arXiv's query API; rss.arxiv.org returns empty feeds outside announcement days.",
    ),
    Feed(
        "arXiv cs.CL",
        "http://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=20",
        "Academic", 360, "entry",
    ),
    Feed(
        "arXiv cs.CV",
        "http://export.arxiv.org/api/query?search_query=cat:cs.CV&sortBy=submittedDate&sortOrder=descending&max_results=20",
        "Academic", 360, "entry",
    ),
    Feed("Ahead of AI", "https://magazine.sebastianraschka.com/feed", "Academic", 120),
    Feed("Import AI", "https://importai.substack.com/feed", "Academic", 120),
    Feed("MarkTechPost", "https://www.marktechpost.com/feed/", "Academic", 60),
    Feed("MIT Technology Review AI", "https://www.technologyreview.com/topic/artificial-intelligence/feed/", "Academic", 60),
    Feed("The Verge AI", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "Academic", 60),
    # Startups and funding
    Feed("Hacker News AI", "https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=20",
         "Startups", 30, kind="hn", note="Newest AI stories first (search_by_date); external links only."),
    Feed("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/", "Startups", 30),
    Feed("VentureBeat AI", "https://venturebeat.com/category/ai/feed/", "Startups", 30,
         note="Returned 429 (rate limit) when tested; may work intermittently."),
    Feed("Inc42", "https://inc42.com/feed/", "Regional (IN)", 60,
         note="Spec URL /buzz/ai/feed/ is 404; this is the site-wide feed, non-AI stories are filtered out."),
    Feed("Entrackr", "https://entrackr.com/feed/", "Regional (IN)", 60, enabled=False,
         note="404: feed URL not found."),
    # Industry verticals
    Feed("Nature Machine Intelligence", "https://www.nature.com/natmachintell.rss", "Verticals", 120),
    Feed("bioRxiv Bioinformatics", "http://connect.biorxiv.org/biorxiv_xml.php?subject=bioinformatics", "Verticals", 360, "entry"),
    Feed("Runway", "https://runwayml.com/blog/rss.xml", "Verticals", 120, enabled=False, note="404: no RSS feed."),
    Feed("80.lv", "https://80.lv/feed/", "Verticals", 60),
    Feed("AgFunder News", "https://agfundernews.com/feed", "Verticals", 60),
    Feed("IEEE Spectrum Robotics", "https://spectrum.ieee.org/feeds/topic/robotics.rss", "Verticals", 60),
    Feed("NASA JPL", "https://www.jpl.nasa.gov/feeds/news/", "Verticals", 120),
    Feed("EdSurge", "https://www.edsurge.com/articles_rss?category=emerging-tech", "Verticals", 120),
]

ENABLED_FEEDS = [f for f in FEEDS if f.enabled]
