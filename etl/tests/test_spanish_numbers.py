"""Unit tests for etl.spanish_numbers -- the cross-validation helpers used to
verify a SIBOM decreto's spelled-out peso amount against the numeric figure
printed alongside it (feature G3, adjudicaciones honesty gate). Real amount
strings, cut from actual archived SIBOM bulletin PDFs.
"""

from etl.spanish_numbers import parse_ars_numeric, words_to_number


def test_words_to_number_simple_millions() -> None:
    assert words_to_number("DIECISIETE MILLONES SETECIENTOS SESENTA MIL") == 17_760_000


def test_words_to_number_single_million_uses_un() -> None:
    assert words_to_number("UN MILLON VEINTISIETE MIL NOVECIENTOS OCHENTA Y NUEVE") == 1_027_989


def test_words_to_number_hundreds_and_thousands() -> None:
    assert words_to_number("CIENTO UN MIL") == 101_000


def test_words_to_number_no_scale_word() -> None:
    assert words_to_number("QUINIENTOS NOVENTA Y DOS MIL NOVECIENTOS") == 592_900


def test_words_to_number_ignores_unknown_tokens() -> None:
    # A real OCR/typo defect ("STECIENTOS" for "SETECIENTOS") should not
    # silently substitute a wrong hundreds value -- the unknown token is
    # simply skipped, which under-counts (the caller's cross-check against
    # the numeric figure then correctly fails and the row is skipped).
    assert words_to_number("ONCE MILLONES STECIENTOS SESENTA MIL") == 11_060_000


def test_words_to_number_returns_none_for_no_recognizable_tokens() -> None:
    assert words_to_number("PESOS ARGENTINOS") is None


def test_parse_ars_numeric_with_comma_decimal() -> None:
    assert parse_ars_numeric("17.760.000,00") == 17_760_000


def test_parse_ars_numeric_with_cents_dropped() -> None:
    assert parse_ars_numeric("2.556.689,22") == 2_556_689


def test_parse_ars_numeric_trailing_dash_dot_stripped() -> None:
    assert parse_ars_numeric("29.152.814.-") == 29_152_814


def test_parse_ars_numeric_no_decimal_separator_at_all() -> None:
    assert parse_ars_numeric("874.720") == 874_720


def test_parse_ars_numeric_mistyped_period_as_decimal_separator() -> None:
    # Real source defect: "$ 4.712.500.00" instead of "$ 4.712.500,00" --
    # the trailing 2-digit group after the LAST period is the (mistyped)
    # decimal part, not another thousands group.
    assert parse_ars_numeric("4.712.500.00") == 4_712_500


def test_parse_ars_numeric_disagrees_with_spelled_amount_on_real_typo() -> None:
    # Real source defect (Decreto 709/2023): the decreto spells "PESOS CIENTO
    # UN MIL" (101.000) but prints "($ 101.00,00.-)" -- a genuine typo in the
    # source document (missing a thousands group). The two readings must NOT
    # be forced to agree; the caller's cross-check is what decides to skip.
    assert parse_ars_numeric("101.00,00") == 10_100
    assert words_to_number("CIENTO UN MIL") == 101_000


def test_parse_ars_numeric_returns_none_for_garbage() -> None:
    assert parse_ars_numeric("no-es-un-monto") is None
