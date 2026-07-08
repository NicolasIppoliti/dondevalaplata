"""Integration test for `build_cadencia`: data/cadencia.json.

Exercises the full pipeline over the REAL archived mcr-docs-snapshot
(archived_manifest.json + archive/mcr-docs-snapshot/documentos-snapshot.json,
via `etl archive --capability mcr-docs-snapshot`) plus the real curated
`etl/cadencia.yaml` and `etl/asap_transparencia.yaml`, asserting the
envelope shape and the REQUIRED honesty invariant carried over from
`test_build_transparencia.py`: the derived dimensions must sum to the same
81/100 headline the curated ASAP score publishes.
"""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from etl.cadencia import DOCUMENTOS_SNAPSHOT_MANIFEST_ID, build_cadencia

REPO_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = REPO_ROOT / "archive-manifest.json"
CADENCIA_CURATED_PATH = REPO_ROOT / "etl" / "cadencia.yaml"
ASAP_CURATED_PATH = REPO_ROOT / "etl" / "asap_transparencia.yaml"
FIXED_NOW = datetime(2026, 7, 8, 12, 0, 0, tzinfo=UTC)

_REAL_DOCUMENTOS_SNAPSHOT_PATH = (
    REPO_ROOT / "archive" / "mcr-docs-snapshot" / "documentos-snapshot.json"
)

# The archive isn't git-versioned by design (R2 is the canonical store) --
# skip the whole module on a fresh clone/CI runner instead of erroring on a
# missing file, same convention as test_build_fallos.py /
# test_build_gasto_partida.py. Checking the LOCAL FILE (not just the
# committed archive-manifest.json's "ok" status) matters: the manifest is
# versioned and legitimately says "ok" even when the actual archived blob
# under archive/ (gitignored, see design D3/W1) is absent on a fresh CI
# checkout -- a status-only check would have skipped nothing in CI and
# crashed with FileNotFoundError instead.
pytestmark = pytest.mark.skipif(
    not _REAL_DOCUMENTOS_SNAPSHOT_PATH.exists(),
    reason=(
        "requires the locally archived mcr-docs-snapshot documentos listing -- "
        "run `uv run etl archive --capability mcr-docs-snapshot` locally first"
    ),
)


def _result() -> dict:
    return build_cadencia(MANIFEST_PATH, CADENCIA_CURATED_PATH, ASAP_CURATED_PATH, now=FIXED_NOW)


def test_build_cadencia_envelope_shape() -> None:
    result = _result()

    assert result["generatedAt"] == "2026-07-08T12:00:00Z"
    assert result["asapReport"] == "Mayo 2026"
    assert len(result["dimensions"]) == 6
    assert "deuda" in result
    assert len(result["sourceRefs"]) > 0


def test_build_cadencia_honesty_invariant() -> None:
    """REQUIRED: the live-derived dimensions must sum to the same headline
    total the curated ASAP score publishes (81/100), and no dimension may
    claim more than its own max -- same guarantee as
    test_build_transparencia.py::test_build_transparencia_honesty_invariant.
    """
    result = _result()

    assert sum(d["got"] for d in result["dimensions"]) == 81
    assert all(d["got"] <= d["max"] for d in result["dimensions"])


def test_build_cadencia_recursos_lags_behind_gastos() -> None:
    """Live-verified (2026-07-08): Ejecución de Recursos is still published
    only through 4to trimestre 2025 while Ejecución de Gastos already
    reached 1er trimestre 2026 -- the exact cadence gap costing +5 points.
    """
    result = _result()
    dim = next(
        d for d in result["dimensions"] if d["name"] == "Ejecución presupuestaria trimestral"
    )

    assert "Ejecución de Gastos" in dim["lastPeriodPublished"]
    assert "Ejecución de Recursos" in dim["lastPeriodPublished"]
    assert dim["got"] == 5
    assert dim["max"] == 10


def test_build_cadencia_deuda_still_stuck_at_q3_2025() -> None:
    """Live-verified (2026-07-08): the last published stock-de-deuda figure
    is still 3er trimestre 2025 ($ 46.876.896,86, cierre 30/09/2025) -- no
    Q4-2025/Q1-2026 publication exists yet.
    """
    result = _result()

    assert result["deuda"]["lastPeriod"] == "3er trimestre 2025"
    assert result["deuda"]["lastFigureArs"] == pytest.approx(46876896.86)
    assert result["deuda"]["quartersMissing"] >= 3


def test_build_cadencia_source_refs_include_the_live_snapshot() -> None:
    result = _result()
    assert DOCUMENTOS_SNAPSHOT_MANIFEST_ID in result["sourceRefs"]
