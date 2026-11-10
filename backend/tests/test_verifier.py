import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from verifier import verify_quote  # noqa: E402

SOURCE = (
    "The lab released a new model today.\n"
    "Our multi-head latent attention decreases memory overhead\n"
    "by 40.2% across long-context evaluations. “It is a big step,” the team wrote — with benchmarks attached.\n"
)


def test_exact_quote_passes():
    ok, reason = verify_quote(SOURCE, "by 40.2% across long-context evaluations.")
    assert ok and reason == "ok"


def test_quote_across_line_break_passes():
    quote = "Our multi-head latent attention decreases memory overhead by 40.2% across long-context evaluations."
    assert verify_quote(SOURCE, quote) == (True, "ok")


def test_curly_quotes_and_dashes_are_equivalent():
    quote = '"It is a big step," the team wrote - with benchmarks attached.'
    assert verify_quote(SOURCE, quote) == (True, "ok")


def test_paraphrase_is_rejected():
    quote = "Our multi-head latent attention reduces memory overhead by 40% in long-context tests."
    assert verify_quote(SOURCE, quote) == (False, "not_in_source")


def test_changed_number_is_rejected():
    quote = "Our multi-head latent attention decreases memory overhead by 45.2% across long-context evaluations."
    assert verify_quote(SOURCE, quote) == (False, "not_in_source")


def test_blank_is_rejected():
    assert verify_quote(SOURCE, "   ") == (False, "blank")


def test_short_fragment_is_rejected():
    assert verify_quote(SOURCE, "a new model today.") == (False, "too_short")
