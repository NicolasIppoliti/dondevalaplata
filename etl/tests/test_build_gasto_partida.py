"""Integration/reconciliation test for `build_gasto_partida` (feature G2):
data/gasto-partida.json.

Exercises the full pipeline over the REAL archived 274-page RAFAM PDF (via a
temp manifest pointing at the real file). This is the HONESTY GATE required
by the task: the sum of every parsed leaf partida's Vigente/Devengado/Pagado
must reconcile against the document's own "TOTALES GENERALES" row, or the
build must fail loudly rather than ship wrong numbers.
"""

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from etl.gasto_partida import GASTO_PARTIDA_MANIFEST_ID, build_gasto_partida

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXED_NOW = datetime(2026, 7, 8, 12, 0, 0, tzinfo=UTC)
_REAL_PDF = (
    REPO_ROOT
    / "archive"
    / "mcr-docs"
    / "estado-de-ejecucion-presupuestaria-de-gastos-1o-trimestre.pdf"
)

# The archive isn't git-versioned by design (R2 is the canonical store, see
# design D3/W1) -- skip the whole module on a fresh clone/CI runner instead
# of erroring on a missing file.
pytestmark = pytest.mark.skipif(
    not _REAL_PDF.exists(),
    reason=(
        "requires the locally archived RAFAM gastos PDF, which is not "
        "git-versioned by design (R2 is the canonical archive store) -- "
        "run `uv run etl archive` locally to populate it"
    ),
)


def _write_manifest(manifest_path: Path) -> None:
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": GASTO_PARTIDA_MANIFEST_ID,
                    "capability": "mcr-docs",
                    "archived_path": str(_REAL_PDF),
                    "status": "ok",
                }
            ]
        ),
        encoding="utf-8",
    )


@pytest.fixture
def result(tmp_path: Path) -> dict:
    manifest_path = tmp_path / "archive-manifest.json"
    _write_manifest(manifest_path)
    return build_gasto_partida(manifest_path, now=FIXED_NOW)


def test_build_gasto_partida_reconciles_exactly_against_totales_generales(
    result: dict,
) -> None:
    reconciliation = result["reconciliation"]
    assert reconciliation["reconciles"] is True
    assert reconciliation["diffVigenteArs"] == pytest.approx(0.0, abs=0.05)
    assert reconciliation["diffDevengadoArs"] == pytest.approx(0.0, abs=0.05)
    assert reconciliation["diffPagadoArs"] == pytest.approx(0.0, abs=0.05)
    assert reconciliation["unverifiedLeafCount"] == 0


def test_build_gasto_partida_known_grand_totals(result: dict) -> None:
    # Regression check against the real PDF's "TOTALES GENERALES" row,
    # decoded and hand-verified once at apply time (see
    # etl/gasto_partida.py's `parse_totales_generales` docstring).
    reconciliation = result["reconciliation"]
    assert reconciliation["totalVigenteArs"] == pytest.approx(44474531919.76)
    assert reconciliation["totalDevengadoArs"] == pytest.approx(11812638195.53)
    assert reconciliation["totalPagadoArs"] == pytest.approx(8533739337.95)


def test_build_gasto_partida_period_and_metadata(result: dict) -> None:
    assert result["period"] == {
        "ejercicio": "2026",
        "from": "2026-01-01",
        "to": "2026-03-31",
        "label": "1er trimestre 2026",
    }
    assert result["generatedAt"] == "2026-07-08T12:00:00Z"
    assert result["sourceRefs"] == [GASTO_PARTIDA_MANIFEST_ID]


def test_build_gasto_partida_tree_is_non_empty_and_every_leaf_has_a_name(
    result: dict,
) -> None:
    jurisdicciones = result["jurisdicciones"]
    assert len(jurisdicciones) > 0
    for jurisdiccion in jurisdicciones:
        assert jurisdiccion["name"]
        assert len(jurisdiccion["programas"]) > 0
        for programa in jurisdiccion["programas"]:
            assert programa["name"]
            assert len(programa["objetos"]) > 0
            for objeto in programa["objetos"]:
                assert objeto["name"]
                assert isinstance(objeto["vigenteArs"], float)
                assert isinstance(objeto["devengadoArs"], float)
                assert isinstance(objeto["pagadoArs"], float)


def test_build_gasto_partida_no_font_defect_glyphs_leak_into_any_name(
    result: dict,
) -> None:
    """Regression guard for the broken-CMap defect (module docstring point 4
    of `etl/gasto_partida.py`): after `fix_known_font_defects` runs, none of
    the three discovered mangled glyphs may remain in any jurisdicción,
    programa or objeto name across the REAL, full 274-page document."""
    defect_chars = set("įķś")
    for jurisdiccion in result["jurisdicciones"]:
        assert not defect_chars & set(jurisdiccion["name"])
        for programa in jurisdiccion["programas"]:
            assert not defect_chars & set(programa["name"])
            for objeto in programa["objetos"]:
                assert not defect_chars & set(objeto["name"])


def test_build_gasto_partida_raises_when_reconciliation_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Honesty gate: a corrupted/incomplete extraction must FAIL the build,
    never silently ship wrong numbers."""
    import etl.gasto_partida as module

    def fake_extract_pdf_text(_path: Path) -> str:
        # A grand total whose Devengado doesn't match any leaf sum at all
        # (no leaves parsed from this text), while still exposing a valid
        # period + a self-consistent TOTALES GENERALES row.
        return (
            "Ejercicio: Hoja: 1 de 1R.A.F.A.M. 01/01/20260:00 "
            "Del 01/01/2026 al 31/03/2026 "
            "100,00 0,00 0,00 100,00 100,00 0,00TOTALES GENERALES 100,00 0,00"
        )

    monkeypatch.setattr(module, "extract_pdf_text", fake_extract_pdf_text)
    manifest_path = tmp_path / "archive-manifest.json"
    _write_manifest(manifest_path)

    with pytest.raises(ValueError, match="reconciliation failed"):
        module.build_gasto_partida(manifest_path)
