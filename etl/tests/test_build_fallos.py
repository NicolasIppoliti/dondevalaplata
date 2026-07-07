"""Integration test for `build_fallos` (task 3.10): data/fallos.json.

Exercises the full pipeline over the real archived 2022/2023/2024 PDFs
(via a temp manifest pointing at the real files) plus the real curated
2022 ficha, asserting the FalloRecord shape and the neutrality
invariant: identical field set across ejercicios/administrations.
"""

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from etl.fallos import build_fallos

REPO_ROOT = Path(__file__).resolve().parents[2]
FICHA_2022_PATH = REPO_ROOT / "etl" / "fallos_ficha_2022.yaml"
FIXED_NOW = datetime(2026, 7, 7, 12, 0, 0, tzinfo=UTC)


def _write_manifest(manifest_path: Path) -> None:
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": "htc-fallos/coronel-rosales-2023",
                    "capability": "htc-fallos",
                    "archived_path": str(
                        REPO_ROOT / "archive" / "htc-fallos" / "coronel-rosales-2023.pdf"
                    ),
                    "status": "ok",
                },
                {
                    "id": "htc-fallos/coronel-rosales-2024",
                    "capability": "htc-fallos",
                    "archived_path": str(
                        REPO_ROOT / "archive" / "htc-fallos" / "coronel-rosales-2024.pdf"
                    ),
                    "status": "ok",
                },
            ]
        ),
        encoding="utf-8",
    )


@pytest.fixture
def result(tmp_path: Path) -> dict:
    manifest_path = tmp_path / "archive-manifest.json"
    _write_manifest(manifest_path)
    return build_fallos(manifest_path, FICHA_2022_PATH, now=FIXED_NOW)


def test_build_fallos_produces_one_record_per_fine(result: dict) -> None:
    # 2022: 1 fine, 2023: 3 fines, 2024: 2 fines.
    assert len(result["records"]) == 6
    ejercicios = sorted({r["ejercicio"] for r in result["records"]})
    assert ejercicios == ["2022", "2023", "2024"]


def test_build_fallos_field_set_identical_across_administrations(result: dict) -> None:
    field_sets = {frozenset(r.keys()) for r in result["records"]}
    # Every record, in every ejercicio/administration, has exactly the
    # same field set -- the neutrality/identical-template invariant
    # (htc-fallos spec).
    assert len(field_sets) == 1


def test_build_fallos_known_fine_amounts(result: dict) -> None:
    uset_2023 = next(
        r
        for r in result["records"]
        if r["ejercicio"] == "2023" and r["official"] == "Mariano Cecilio Uset"
    )
    assert uset_2023["fineArs"] == 300000.0

    aristimuno_2024 = next(
        r
        for r in result["records"]
        if r["ejercicio"] == "2024" and r["official"] == "Rodrigo Lionel Aristimuño"
    )
    assert aristimuno_2024["fineArs"] == 650000.0


def test_build_fallos_2022_scanned_marker_and_2023_2024_not_scanned(result: dict) -> None:
    by_ejercicio = {r["ejercicio"]: r for r in result["records"]}
    assert by_ejercicio["2022"]["scanned"] is True
    assert by_ejercicio["2023"]["scanned"] is False
    assert by_ejercicio["2024"]["scanned"] is False


def test_build_fallos_metadata(result: dict) -> None:
    assert result["generatedAt"] == "2026-07-07T12:00:00Z"
    assert set(result["sourceRefs"]) == {
        "htc-fallos/coronel-rosales-2022",
        "htc-fallos/coronel-rosales-2023",
        "htc-fallos/coronel-rosales-2024",
    }
