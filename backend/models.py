"""The structured shape the LLM must fill in for each article."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

CATEGORIES = (
    "Model Release",
    "Developer Tool",
    "Research Paper",
    "Hardware/Chips",
    "Startup Funding",
    "Product Update",
    "Guides & Education",
    "Industry News",
)
INDUSTRIES = (
    "General",
    "Medicine & Healthcare",
    "Filmmaking & Media",
    "Agriculture",
    "Space & Robotics",
    "Education",
    "Enterprise",
)


class VerifiedIntelExtraction(BaseModel):
    is_relevant: bool = Field(
        description=(
            "True if the article is mainly about artificial intelligence in any way: models, tools, "
            "products and features, research, robotics, chips and hardware, funding, business and "
            "market news, policy and safety, education, how-to guides, or AI being used in any field. "
            "False only if AI is not the main subject, or the page has no real information "
            "(job adverts, memes, jokes, bare questions with no answer)."
        )
    )
    title: str = Field(description="Objective, concise, factual headline without marketing hype")
    entity_name: str = Field(description="Company, lab, or author (e.g., DeepSeek, OpenAI, Sarvam AI)")
    primary_category: Literal[
        "Model Release",
        "Developer Tool",
        "Research Paper",
        "Hardware/Chips",
        "Startup Funding",
        "Product Update",
        "Guides & Education",
        "Industry News",
    ] = Field(
        description=(
            "Model Release: a new or updated AI model. Developer Tool: SDKs, APIs, frameworks. "
            "Research Paper: papers and research results. Hardware/Chips: chips, servers, robots' hardware. "
            "Startup Funding: funding rounds and acquisitions. Product Update: a new AI product or feature "
            "for end users. Guides & Education: how-to, learning and awareness content. "
            "Industry News: business, market, policy and other AI news."
        )
    )
    industry_tag: Literal[
        "General",
        "Medicine & Healthcare",
        "Filmmaking & Media",
        "Agriculture",
        "Space & Robotics",
        "Education",
        "Enterprise",
    ]
    summary: str = Field(description="2-3 sentence technical overview of what was released or discovered")
    exact_source_quote: str = Field(
        description=(
            "MANDATORY: One complete sentence copied word-for-word from the provided text that "
            "proves the main claim. Must be 100% identical to the text, at least 40 characters."
        )
    )
    country_of_origin: Optional[str] = Field(
        default="Global", description="HQ country: United States, India, China, France, etc."
    )
