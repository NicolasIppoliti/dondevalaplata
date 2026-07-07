"""Unit tests for text-layer HTC fallo PDF extraction (task 3.8).

Fixtures (`fixtures/fallo_2023_extract.txt`, `fallo_2024_extract.txt`) are
real text cut directly from `pypdf` extraction of the archived 2023/2024
PDFs (header + "RESULTA I" intendente-term clause + the "RESUELVE" fine
clause) -- not synthetic text. A slower end-to-end test additionally
runs the real extraction against the full archived PDFs.
"""

from pathlib import Path

import pytest

from etl.fallos import (
    Fine,
    extract_pdf_text,
    parse_administration,
    parse_expediente,
    parse_fallo_date,
    parse_fines,
    parse_text_layer_fallo,
)

FIXTURES = Path(__file__).parent / "fixtures"
REPO_ROOT = Path(__file__).resolve().parents[2]
_REAL_PDF_2023 = REPO_ROOT / "archive" / "htc-fallos" / "coronel-rosales-2023.pdf"
_REAL_PDF_2024 = REPO_ROOT / "archive" / "htc-fallos" / "coronel-rosales-2024.pdf"
_MISSING_REAL_ARCHIVE_REASON = (
    "requires the locally archived HTC fallo PDFs, which are not "
    "git-versioned by design (R2 is the canonical archive store, see "
    "design D3/W1) -- run `uv run etl archive` locally to populate them"
)


def _read(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parse_expediente_extracts_number() -> None:
    assert parse_expediente(_read("fallo_2023_extract.txt")) == "3-024.0-2023"
    assert parse_expediente(_read("fallo_2024_extract.txt")) == "3-024.0-2024"


def test_parse_fallo_date_converts_spanish_date_to_iso() -> None:
    assert parse_fallo_date(_read("fallo_2023_extract.txt")) == "2025-03-13"
    assert parse_fallo_date(_read("fallo_2024_extract.txt")) == "2026-04-09"


def test_parse_administration_captures_both_intendentes_for_2023() -> None:
    administration = parse_administration(_read("fallo_2023_extract.txt"))

    assert "Mariano Cecilio Uset (01/01/2023" in administration
    assert "Rodrigo Lionel Aristimuño (12/12/2023" in administration


def test_parse_administration_captures_single_intendente_for_2024() -> None:
    administration = parse_administration(_read("fallo_2024_extract.txt"))

    assert administration == "Rodrigo Lionel Aristimuño (01/01/2024–31/12/2024)"


def test_parse_fines_extracts_2023_multas() -> None:
    fines = parse_fines(_read("fallo_2023_extract.txt"))

    assert (
        Fine(role="Intendente Municipal", official="Mariano Cecilio Uset", fine_ars=300000.0)
        in fines
    )
    bustamante_2023 = Fine(
        role="Contadora Municipal", official="Patricia Elisabeth Bustamante", fine_ars=300000.0
    )
    assert bustamante_2023 in fines
    assert (
        Fine(role="Intendente Municipal", official="Rodrigo Lionel Aristimuño", fine_ars=250000.0)
        in fines
    )
    assert len(fines) == 3


def test_parse_fines_extracts_2024_multas() -> None:
    fines = parse_fines(_read("fallo_2024_extract.txt"))

    assert (
        Fine(role="Intendente Municipal", official="Rodrigo Lionel Aristimuño", fine_ars=650000.0)
        in fines
    )
    bustamante_2024 = Fine(
        role="Contadora Municipal", official="Patricia Elisabeth Bustamante", fine_ars=500000.0
    )
    assert bustamante_2024 in fines
    # "Llamados de Atención" (non-monetary call-outs) must never be parsed as fines.
    officials = {f.official for f in fines}
    assert "Juan Manuel Berrone" not in officials
    assert len(fines) == 2


def test_parse_text_layer_fallo_builds_ficha() -> None:
    ficha = parse_text_layer_fallo(
        _read("fallo_2023_extract.txt"),
        ejercicio="2023",
        source_ref="htc-fallos/coronel-rosales-2023",
    )

    assert ficha.ejercicio == "2023"
    assert ficha.fallo_id == "3-024.0-2023"
    assert ficha.text_extracted is True
    assert ficha.scanned is False
    assert ficha.source_ref == "htc-fallos/coronel-rosales-2023"
    assert len(ficha.fines) == 3


@pytest.mark.skipif(
    not (_REAL_PDF_2023.exists() and _REAL_PDF_2024.exists()),
    reason=_MISSING_REAL_ARCHIVE_REASON,
)
def test_end_to_end_extraction_against_real_archived_pdfs() -> None:
    """Confidence check: the real PDFs, not just the trimmed fixtures."""
    ficha_2023 = parse_text_layer_fallo(
        extract_pdf_text(REPO_ROOT / "archive" / "htc-fallos" / "coronel-rosales-2023.pdf"),
        ejercicio="2023",
        source_ref="htc-fallos/coronel-rosales-2023",
    )
    ficha_2024 = parse_text_layer_fallo(
        extract_pdf_text(REPO_ROOT / "archive" / "htc-fallos" / "coronel-rosales-2024.pdf"),
        ejercicio="2024",
        source_ref="htc-fallos/coronel-rosales-2024",
    )

    uset_fine = next(f for f in ficha_2023.fines if f.official == "Mariano Cecilio Uset")
    assert uset_fine.fine_ars == 300000.0

    aristimuno_fine = next(f for f in ficha_2024.fines if f.official == "Rodrigo Lionel Aristimuño")
    assert aristimuno_fine.fine_ars == 650000.0
