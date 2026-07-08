"""Unit tests for "Stock de Deuda y Perfil de Vencimientos" PDF parsing
(feature H2a). Fixtures (`fixtures/deuda_historica_*_trimestre_extract.txt`)
are the real, full `pypdf` text-layer extraction of each of the three
archived quarterly PDFs (each document is a single small page, so the
"small fixture" is the whole real extract, not a further-trimmed excerpt)
-- see module docstring in `etl/deuda_historica.py` for the deliberate
decision to NOT attempt a composition breakdown.
"""

from pathlib import Path

import pytest

from etl.deuda_historica import parse_amount_en_us, parse_deuda_stock_pdf

FIXTURES = Path(__file__).parent / "fixtures"


def _read(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parse_amount_en_us_handles_comma_thousands_and_dot_decimal() -> None:
    assert parse_amount_en_us("194,447,135.09") == pytest.approx(194447135.09)
    assert parse_amount_en_us("46,876,896.86") == pytest.approx(46876896.86)
    assert parse_amount_en_us("0.00") == 0.0


def test_parse_deuda_stock_pdf_1er_trimestre() -> None:
    result = parse_deuda_stock_pdf(_read("deuda_historica_1o_trimestre_extract.txt"))
    assert result == {
        "period": "2025-Q1",
        "periodLabel": "1er trimestre 2025",
        "fecha": "2025-03-31",
        "totalArs": pytest.approx(194447135.09),
    }


def test_parse_deuda_stock_pdf_2do_trimestre() -> None:
    result = parse_deuda_stock_pdf(_read("deuda_historica_2o_trimestre_extract.txt"))
    assert result == {
        "period": "2025-Q2",
        "periodLabel": "2do trimestre 2025",
        "fecha": "2025-06-30",
        "totalArs": pytest.approx(46286612.42),
    }


def test_parse_deuda_stock_pdf_3er_trimestre() -> None:
    result = parse_deuda_stock_pdf(_read("deuda_historica_3o_trimestre_extract.txt"))
    assert result == {
        "period": "2025-Q3",
        "periodLabel": "3er trimestre 2025",
        "fecha": "2025-09-30",
        "totalArs": pytest.approx(46876896.86),
    }


def test_parse_deuda_stock_pdf_raises_when_no_date_found() -> None:
    with pytest.raises(ValueError, match="SALDO AL"):
        parse_deuda_stock_pdf("1.  DEUDA PÚBLICA 46,876,896.86 245,229.51")


def test_parse_deuda_stock_pdf_raises_when_no_headline_total_found() -> None:
    with pytest.raises(ValueError, match="headline"):
        parse_deuda_stock_pdf("ORGANISMO ACREEDOR 30/09/2025 AMORTIZ. INTERESES")


def test_parse_deuda_stock_pdf_does_not_confuse_1_1_subtotal_with_headline() -> None:
    """Regression guard: "1.1.  DEUDA PÚBLICA CONSOLIDADA <amount>" must never
    be mistaken for the standalone "1.  DEUDA PÚBLICA <amount>" headline row
    -- see the real fixtures, where both literally contain the substring
    "DEUDA PÚBLICA" back to back on consecutive lines."""
    text = (
        "ORGANISMO ACREEDOR 30/09/2025 AMORTIZ.\n"
        "1.1.  DEUDA PÚBLICA CONSOLIDADA 999,999,999.99\n"
        "1.  DEUDA PÚBLICA 46,876,896.86 245,229.51\n"
    )
    result = parse_deuda_stock_pdf(text)
    assert result["totalArs"] == pytest.approx(46876896.86)
