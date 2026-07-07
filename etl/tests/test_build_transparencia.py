"""Integration test for `build_transparencia`: data/transparencia.json.

Exercises the full build over the real curated source
(`etl/asap_transparencia.yaml`), asserting the envelope shape and the
REQUIRED honesty invariant: the published breakdown must sum to the
headline total, and no dimension may exceed its own max.
"""

from datetime import UTC, datetime
from pathlib import Path

from etl.transparencia import build_transparencia

REPO_ROOT = Path(__file__).resolve().parents[2]
CURATED_PATH = REPO_ROOT / "etl" / "asap_transparencia.yaml"
FIXED_NOW = datetime(2026, 7, 7, 12, 0, 0, tzinfo=UTC)


def _result() -> dict:
    return build_transparencia(CURATED_PATH, now=FIXED_NOW)


def test_build_transparencia_envelope_shape() -> None:
    result = _result()

    assert result["generatedAt"] == "2026-07-07T12:00:00Z"
    assert result["source"] == "ASAP"
    assert result["sourceType"] == "asociación civil (no es un ministerio)"
    assert result["total"] == 81
    assert result["max"] == 100
    assert result["category"] == "Alto cumplimiento"
    assert result["indexUrl"] == (
        "https://asap.org.ar/informes-detalle/cumplimiento-municipios/8"
    )
    assert len(result["dimensions"]) == 6
    assert len(result["trend"]) == 2
    assert set(result["sourceRefs"]) == {
        "asap-transparencia/informe-mayo-2026",
        "asap-transparencia/informe-noviembre-2025",
    }


def test_build_transparencia_honesty_invariant() -> None:
    """REQUIRED (spec): the published breakdown must be internally
    consistent with the headline total, and no dimension may exceed its
    own max -- this is the integrity guarantee behind every subscore shown
    on the site.
    """
    result = _result()

    assert sum(d["got"] for d in result["dimensions"]) == result["total"] == 81
    assert all(d["got"] <= d["max"] for d in result["dimensions"])


def test_build_transparencia_trend_matches_verified_arc() -> None:
    result = _result()

    trend_by_label = {t["reportLabel"]: t["total"] for t in result["trend"]}
    assert trend_by_label == {"Noviembre 2025": 70, "Mayo 2026": 81}


def test_build_transparencia_dimension_names_and_values() -> None:
    result = _result()
    by_name = {d["name"]: (d["got"], d["max"]) for d in result["dimensions"]}

    assert by_name["Acceso web fácil a la información"] == (5, 5)
    assert by_name["Presupuesto vigente publicado"] == (30, 30)
    assert by_name["Situación económico-financiera (SEF) trimestral"] == (35, 35)
    assert by_name["Ejecución presupuestaria trimestral"] == (5, 10)
    assert by_name["Gastos por finalidad y función"] == (3, 10)
    assert by_name["Stock de deuda y perfil de vencimientos"] == (3, 10)
