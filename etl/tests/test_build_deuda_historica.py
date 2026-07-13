"""Integration test for `build_deuda_historica` (feature H2a):
data/deuda-historica.json.

Exercises the full pipeline over the THREE REAL archived stock-de-deuda
PDFs (via a temp manifest pointing at the real files).
"""

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from etl.deuda_historica import (
    DEUDA_HISTORICA_MANIFEST_IDS,
    build_deuda_historica,
    load_curated_anomalies,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXED_NOW = datetime(2026, 7, 8, 12, 0, 0, tzinfo=UTC)
DEUDA_ANOMALIES_PATH = REPO_ROOT / "etl" / "deuda_anomalies.yaml"
_REAL_PDFS = [
    REPO_ROOT / "archive" / "mcr-docs" / f"{manifest_id.split('/', 1)[1]}.pdf"
    for manifest_id in DEUDA_HISTORICA_MANIFEST_IDS
]

# The archive isn't git-versioned by design (R2 is the canonical store, see
# design D3/W1) -- skip the whole module on a fresh clone/CI runner instead
# of erroring on a missing file. Checking the REAL local blobs' `.exists()`
# (never just the committed manifest's "ok" status) -- same CI-hygiene rule
# as test_build_gasto_partida.py / test_build_fallos.py.
pytestmark = pytest.mark.skipif(
    not all(pdf.exists() for pdf in _REAL_PDFS),
    reason=(
        "requires the three locally archived stock-de-deuda PDFs, which are "
        "not git-versioned by design (R2 is the canonical archive store) -- "
        "run `uv run etl archive --capability mcr-docs` locally to populate them"
    ),
)


def _write_manifest(manifest_path: Path) -> None:
    records = [
        {
            "id": manifest_id,
            "capability": "mcr-docs",
            "archived_path": str(pdf_path),
            "status": "ok",
        }
        for manifest_id, pdf_path in zip(DEUDA_HISTORICA_MANIFEST_IDS, _REAL_PDFS, strict=True)
    ]
    manifest_path.write_text(json.dumps(records), encoding="utf-8")


@pytest.fixture
def result(tmp_path: Path) -> dict:
    manifest_path = tmp_path / "archive-manifest.json"
    _write_manifest(manifest_path)
    return build_deuda_historica(manifest_path, DEUDA_ANOMALIES_PATH, now=FIXED_NOW)


def test_build_deuda_historica_envelope_shape(result: dict) -> None:
    assert result["generatedAt"] == "2026-07-08T12:00:00Z"
    assert result["sourceRefs"] == DEUDA_HISTORICA_MANIFEST_IDS
    assert len(result["series"]) == len(DEUDA_HISTORICA_MANIFEST_IDS)


def test_build_deuda_historica_series_is_oldest_first(result: dict) -> None:
    periods = [entry["period"] for entry in result["series"]]
    assert periods == ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2"]


def test_build_deuda_historica_known_real_totals(result: dict) -> None:
    # Live-verified (2026-07-08 for Q1-Q3 2025; 2026-07-13 for the
    # 2026-07-13 backfill of Q4-2025/Q1-2026/Q2-2026) against the real
    # archived PDFs -- see etl/deuda_historica.py's module docstring for the
    # parsing approach.
    by_period = {entry["period"]: entry for entry in result["series"]}

    assert by_period["2025-Q1"]["totalArs"] == pytest.approx(194447135.09)
    assert by_period["2025-Q1"]["fecha"] == "2025-03-31"

    assert by_period["2025-Q2"]["totalArs"] == pytest.approx(46286612.42)
    assert by_period["2025-Q2"]["fecha"] == "2025-06-30"

    assert by_period["2025-Q3"]["totalArs"] == pytest.approx(46876896.86)
    assert by_period["2025-Q3"]["fecha"] == "2025-09-30"
    assert by_period["2025-Q3"]["sourceRef"] == (
        "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre"
    )

    assert by_period["2025-Q4"]["totalArs"] == pytest.approx(1826113416.70)
    assert by_period["2025-Q4"]["fecha"] == "2025-12-31"

    assert by_period["2026-Q1"]["totalArs"] == pytest.approx(169183140.12)
    assert by_period["2026-Q1"]["fecha"] == "2026-03-31"

    assert by_period["2026-Q2"]["totalArs"] == pytest.approx(110097259.09)
    assert by_period["2026-Q2"]["fecha"] == "2026-06-30"
    assert by_period["2026-Q2"]["sourceRef"] == (
        "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-2o-trimestre-2"
    )


def test_build_deuda_historica_reproduces_the_curated_q4_2025_anomaly(result: dict) -> None:
    """Durability regression guard: `etl/deuda_anomalies.yaml` curates the
    4to trimestre 2025 outlier annotation (see that file's module comment
    and `etl.deuda_historica.load_curated_anomalies`), and a REAL build
    over the REAL archived PDFs must reproduce it byte-for-byte on the
    matching period's point -- proving a future monthly
    `etl build-deuda-historica` re-run will NOT silently drop it (which is
    exactly what would happen if the annotation only lived as a hand-edit
    to the committed `data/deuda-historica.json`). If a future change to
    the parser/merge logic ever drops this field, THIS test fails.
    """
    by_period = {entry["period"]: entry for entry in result["series"]}

    assert by_period["2025-Q4"]["anomaly"] == {
        "flagged": True,
        "note": (
            "El municipio declaró $ 1.826.113.416,70 como \"1. Deuda "
            "Pública / Saldo\" del 4to trimestre 2025 — unas 39 veces el "
            "de los trimestres vecinos. Es una inconsistencia que no se "
            "explica en la fuente; la mostramos tal como fue publicada, "
            "sin corregirla."
        ),
    }

    # Every other quarter must NOT carry an anomaly -- this is a targeted
    # annotation, never a blanket default.
    for period, entry in by_period.items():
        if period != "2025-Q4":
            assert "anomaly" not in entry, f"unexpected anomaly on {period}"


def test_build_deuda_historica_is_idempotent_across_two_real_builds(tmp_path: Path) -> None:
    """CRITICAL acceptance: running the real build twice in a row (same
    inputs) must produce BYTE-IDENTICAL JSON, including the merged
    anomaly -- this is what proves a real monthly cron re-run is safe and
    will not wipe or drift the annotation.
    """
    manifest_path = tmp_path / "archive-manifest.json"
    _write_manifest(manifest_path)

    first = build_deuda_historica(manifest_path, DEUDA_ANOMALIES_PATH, now=FIXED_NOW)
    second = build_deuda_historica(manifest_path, DEUDA_ANOMALIES_PATH, now=FIXED_NOW)

    assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)
    by_period = {entry["period"]: entry for entry in second["series"]}
    assert by_period["2025-Q4"]["anomaly"]["flagged"] is True


def test_curated_anomalies_periods_all_match_a_real_period_the_build_produces(
    result: dict,
) -> None:
    """Guard against a typo'd period key in `etl/deuda_anomalies.yaml`
    silently no-op-ing: every curated period must match an ACTUAL period
    the real build produces from the real archived PDFs, or the
    annotation would never attach to anything and nobody would notice.
    """
    anomalies = load_curated_anomalies(DEUDA_ANOMALIES_PATH)
    assert anomalies, "expected at least one curated anomaly entry to guard"

    real_periods = {entry["period"] for entry in result["series"]}
    for period in anomalies:
        assert period in real_periods, (
            f"curated period {period!r} in etl/deuda_anomalies.yaml does not "
            f"match any real period {sorted(real_periods)!r} -- likely a typo"
        )
