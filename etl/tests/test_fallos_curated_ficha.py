"""Unit tests for the curated 2022 scanned-fallo ficha (task 3.9)."""

from pathlib import Path

from etl.fallos import Fine, load_curated_ficha

REPO_ROOT = Path(__file__).resolve().parents[2]
FICHA_2022_PATH = REPO_ROOT / "etl" / "fallos_ficha_2022.yaml"


def test_load_curated_ficha_2022_marks_scanned_and_no_text_extraction() -> None:
    ficha = load_curated_ficha(FICHA_2022_PATH)

    assert ficha.scanned is True
    assert ficha.text_extracted is False


def test_load_curated_ficha_2022_has_required_fields() -> None:
    ficha = load_curated_ficha(FICHA_2022_PATH)

    assert ficha.ejercicio == "2022"
    assert ficha.fallo_id == "3-024.0-2022"
    assert ficha.fallo_date == "2024-03-14"
    assert ficha.administration == "Mariano Cecilio Uset (01/01/2022–31/12/2022)"
    assert ficha.source_ref == "htc-fallos/coronel-rosales-2022"
    assert ficha.fines == [
        Fine(role="Intendente Municipal", official="Mariano Cecilio Uset", fine_ars=100000.0)
    ]
