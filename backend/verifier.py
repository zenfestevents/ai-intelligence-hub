"""The gatekeeper: a purely mechanical check that a quote appears in the source text.

No LLM is involved. Both the quote and the source go through the same character
normalization (whitespace, quote marks, dashes) and then a plain substring test.
"""
import re
import unicodedata
from typing import Tuple

MIN_QUOTE_CHARS = 40

_CHAR_MAP = str.maketrans(
    {
        "‘": "'", "’": "'", "‚": "'", "‛": "'",
        "“": '"', "”": '"', "„": '"', "‟": '"',
        "‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-", "−": "-",
        " ": " ", "​": "", "‌": "", "‍": "", "﻿": "",
    }
)
_WHITESPACE = re.compile(r"\s+")


def normalize(text: str) -> str:
    """Make text comparable: same unicode form, plain quotes/dashes, single spaces."""
    text = unicodedata.normalize("NFKC", text or "")
    text = text.translate(_CHAR_MAP)
    return _WHITESPACE.sub(" ", text).strip()


def verify_quote(raw_text: str, quote: str) -> Tuple[bool, str]:
    """Return (passed, reason). reason is 'ok', 'blank', 'too_short' or 'not_in_source'."""
    q = normalize(quote).strip("\"' ")
    if not q:
        return False, "blank"
    if len(q) < MIN_QUOTE_CHARS:
        return False, "too_short"
    if q not in normalize(raw_text):
        return False, "not_in_source"
    return True, "ok"
