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
FIXED_NOW = datetime(2026, 7, 13, 12, 0, 0, tzinfo=UTC)

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

    assert result["generatedAt"] == "2026-07-13T12:00:00Z"
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


def test_build_cadencia_recursos_and_gastos_caught_up_after_2026_07_13_backfill() -> None:
    """Live-verified (2026-07-13): the municipality backfilled Ejecución de
    Recursos and Ejecución de Gastos to 2do trimestre 2026 the same day,
    closing the cadence gap between the two series. `got`/`max` stay frozen
    to the curated ASAP score (never fabricated -- ASAP has not re-scored),
    but `caughtUp` reflects the live, current publication status.
    """
    result = _result()
    dim = next(
        d for d in result["dimensions"] if d["name"] == "Ejecución presupuestaria trimestral"
    )

    assert "Ejecución de Gastos" in dim["lastPeriodPublished"]
    assert "Ejecución de Recursos" in dim["lastPeriodPublished"]
    assert dim["got"] == 5
    assert dim["max"] == 10
    assert dim["caughtUp"] is True


def test_build_cadencia_deuda_caught_up_after_2026_07_13_backfill() -> None:
    """Live-verified (2026-07-13): the municipality backfilled Stock de
    deuda through 2do trimestre 2026 ($ 110.097.259,09, cierre 30/06/2026)
    in the same batch as Q4-2025 and Q1-2026.
    """
    result = _result()

    assert result["deuda"]["lastPeriod"] == "2do trimestre 2026"
    assert result["deuda"]["lastFigureArs"] == pytest.approx(110097259.09)
    assert result["deuda"]["quartersMissing"] == 0


def test_build_cadencia_source_refs_include_the_live_snapshot() -> None:
    result = _result()
    assert DOCUMENTOS_SNAPSHOT_MANIFEST_ID in result["sourceRefs"]
