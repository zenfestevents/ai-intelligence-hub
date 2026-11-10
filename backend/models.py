"""The structured shape the LLM must fill in for each article."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

CATEGORIES = ("Model Release", "Developer Tool", "Research Paper", "Hardware/Chips", "Startup Funding")
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
            "True only if the article reports a concrete AI development: a model release, developer "
            "tool, research result, AI hardware/chips, or AI startup funding. False for anything else "
            "(general tech or business news, opinion, job posts, memes, questions)."
        )
    )
    title: str = Field(description="Objective, concise, factual headline without marketing hype")
    entity_name: str = Field(description="Company, lab, or author (e.g., DeepSeek, OpenAI, Sarvam AI)")
    primary_category: Literal[
        "Model Release", "Developer Tool", "Research Paper", "Hardware/Chips", "Startup Funding"
    ]
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
