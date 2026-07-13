"""Unit tests for the curated per-quarter anomaly table
(`etl.deuda_historica.load_curated_anomalies`, `etl/deuda_anomalies.yaml`).

Unlike `test_build_deuda_historica.py`, these tests never touch the real
archived PDFs (`extract_pdf_text`/`resolve_archived_path` are monkeypatched
with synthetic text) -- so they run unconditionally in CI, even on a fresh
clone with no local `archive/` tree. This is where the GENERAL merge
behavior is proven (not hardcoded to the real 2025-Q4 entry), so a future
parser/merge change that drops the annotation fails here regardless of
which period happens to be curated.
"""

import json
from pathlib import Path

import pytest

from etl import deuda_historica as dh

REPO_ROOT = Path(__file__).resolve().parents[2]
DEUDA_ANOMALIES_PATH = REPO_ROOT / "etl" / "deuda_anomalies.yaml"


def _write_yaml(tmp_path: Path, content: str) -> Path:
    path = tmp_path / "deuda_anomalies.yaml"
    path.write_text(content, encoding="utf-8")
    return path


def test_load_curated_anomalies_reads_the_real_q4_2025_entry() -> None:
    anomalies = dh.load_curated_anomalies(DEUDA_ANOMALIES_PATH)

    assert "2025-Q4" in anomalies
    entry = anomalies["2025-Q4"]
    assert entry["flagged"] is True
    assert entry["note"].strip() != ""
    assert entry["note"] == (
        "El municipio declaró $ 1.826.113.416,70 como \"1. Deuda Pública / "
        "Saldo\" del 4to trimestre 2025 — unas 39 veces el de los "
        "trimestres vecinos. Es una inconsistencia que no se explica en la "
        "fuente; la mostramos tal como fue publicada, sin corregirla."
    )


def test_load_curated_anomalies_generalizes_to_a_second_synthetic_period(
    tmp_path,
) -> None:
    """Triangulation: proves the loader is real table-handling logic, not a
    2025-Q4-only hardcode -- a second, wholly different period round-trips
    correctly too."""
    anomalies = dh.load_curated_anomalies(
        _write_yaml(
            tmp_path,
            """
anomalies:
  "2030-Q2":
    flagged: true
    note: "Nota sintética de prueba, no vinculada a ningún trimestre real."
""",
        )
    )

    assert list(anomalies.keys()) == ["2030-Q2"]
    assert anomalies["2030-Q2"] == {
        "flagged": True,
        "note": "Nota sintética de prueba, no vinculada a ningún trimestre real.",
    }


def test_load_curated_anomalies_rejects_a_blank_note(tmp_path) -> None:
    """Guard against a curated entry with nothing to say (also catches a
    typo'd period key that maps to an accidentally-empty note)."""
    path = _write_yaml(
        tmp_path,
        """
anomalies:
  "2030-Q2":
    flagged: true
    note: "   "
""",
    )

    with pytest.raises(ValueError, match="2030-Q2"):
        dh.load_curated_anomalies(path)


def test_load_curated_anomalies_returns_empty_mapping_when_no_anomalies_key(
    tmp_path,
) -> None:
    path = _write_yaml(tmp_path, "anomalies: {}\n")
    assert dh.load_curated_anomalies(path) == {}


# ---------------------------------------------------------------------------
# General (non-Q4-2025-hardcoded) merge-through-build regression test
# ---------------------------------------------------------------------------

_SYNTHETIC_TEXTS = {
    dh.DEUDA_HISTORICA_MANIFEST_IDS[0]: (
        "ORGANISMO ACREEDOR 31/03/2025 AMORTIZ. INTERESES\n"
        "1.  DEUDA PÚBLICA 10,000.00\n"
    ),
    dh.DEUDA_HISTORICA_MANIFEST_IDS[1]: (
        "ORGANISMO ACREEDOR 30/06/2025 AMORTIZ. INTERESES\n"
        "1.  DEUDA PÚBLICA 20,000.00\n"
    ),
    dh.DEUDA_HISTORICA_MANIFEST_IDS[2]: (
        "ORGANISMO ACREEDOR 30/09/2025 AMORTIZ. INTERESES\n"
        "1.  DEUDA PÚBLICA 30,000.00\n"
    ),
    dh.DEUDA_HISTORICA_MANIFEST_IDS[3]: (
        "ORGANISMO ACREEDOR 31/12/2025 AMORTIZ. INTERESES\n"
        "1.  DEUDA PÚBLICA 40,000.00\n"
    ),
    dh.DEUDA_HISTORICA_MANIFEST_IDS[4]: (
        "ORGANISMO ACREEDOR 31/03/2026 AMORTIZ. INTERESES\n"
        "1.  DEUDA PÚBLICA 50,000.00\n"
    ),
    dh.DEUDA_HISTORICA_MANIFEST_IDS[5]: (
        "ORGANISMO ACREEDOR 30/06/2026 AMORTIZ. INTERESES\n"
        "1.  DEUDA PÚBLICA 60,000.00\n"
    ),
}


def test_build_deuda_historica_merges_curated_anomaly_onto_matching_period(
    tmp_path, monkeypatch
) -> None:
    """General merge guard, entirely synthetic (no real PDFs, no real
    curated file): a period listed in the curated anomalies table gets its
    `anomaly` field merged onto the matching parsed series point, and every
    OTHER period gets none -- proven against a SYNTHETIC period (2025-Q2,
    not the real 2025-Q4), so this fails if a future change to the merge
    logic only special-cases the real quarter instead of being general.
    """
    monkeypatch.setattr(
        dh, "resolve_archived_path", lambda manifest_path, manifest_id: Path(manifest_id)
    )
    monkeypatch.setattr(dh, "extract_pdf_text", lambda path: _SYNTHETIC_TEXTS[str(path)])

    anomalies_path = _write_yaml(
        tmp_path,
        """
anomalies:
  "2025-Q2":
    flagged: true
    note: "Nota sintética de prueba."
""",
    )
    manifest_path = tmp_path / "archive-manifest.json"  # unused (resolve_archived_path patched)

    result = dh.build_deuda_historica(manifest_path, anomalies_path)

    by_period = {entry["period"]: entry for entry in result["series"]}
    assert by_period["2025-Q2"]["anomaly"] == {
        "flagged": True,
        "note": "Nota sintética de prueba.",
    }
    for period, entry in by_period.items():
        if period != "2025-Q2":
            assert "anomaly" not in entry, f"unexpected anomaly on {period}"


def test_build_deuda_historica_output_is_json_serializable_with_merged_anomaly(
    tmp_path, monkeypatch
) -> None:
    """The merged `anomaly` field must round-trip through the same
    `json.dumps(..., ensure_ascii=False)` the CLI uses to write
    `data/deuda-historica.json` -- guards the field shape the web schema
    expects (`{flagged, note}`, both JSON-primitive types)."""
    monkeypatch.setattr(
        dh, "resolve_archived_path", lambda manifest_path, manifest_id: Path(manifest_id)
    )
    monkeypatch.setattr(dh, "extract_pdf_text", lambda path: _SYNTHETIC_TEXTS[str(path)])

    anomalies_path = _write_yaml(
        tmp_path,
        """
anomalies:
  "2025-Q4":
    flagged: true
    note: "Nota sintética de prueba."
""",
    )
    manifest_path = tmp_path / "archive-manifest.json"

    result = dh.build_deuda_historica(manifest_path, anomalies_path)
    payload = json.loads(json.dumps(result, ensure_ascii=False))
    by_period = {entry["period"]: entry for entry in payload["series"]}
    assert by_period["2025-Q4"]["anomaly"] == {"flagged": True, "note": "Nota sintética de prueba."}
