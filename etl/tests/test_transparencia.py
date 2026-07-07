"""Unit tests for the curated ASAP transparency-score source (etl.transparencia).

ASAP (Asociación Argentina de Presupuesto y Administración Financiera
Pública, Filial Provincia de Buenos Aires) is a civil/professional
association, NOT a ministry -- the original owner claim ("Ministerio de
Capital Humano") was factually wrong (Capital Humano publishes no
municipal index) and must never reappear in the curated source or the
built payload.
"""

from dataclasses import replace
from pathlib import Path

import pytest

from etl.transparencia import Dimension, assert_honest, load_curated_transparencia

REPO_ROOT = Path(__file__).resolve().parents[2]
CURATED_PATH = REPO_ROOT / "etl" / "asap_transparencia.yaml"


def test_load_curated_transparencia_has_required_fields() -> None:
    score = load_curated_transparencia(CURATED_PATH)

    assert score.source == "ASAP"
    assert "civil" in score.source_type.lower()
    assert score.index_name == (
        "Índice de Transparencia Fiscal Municipal – Provincia de Buenos Aires"
    )
    assert score.report_label == "Informe de Mayo 2026"
    assert score.data_through == "1er trimestre 2026"
    assert score.total == 81
    assert score.max == 100
    assert score.category == "Alto cumplimiento"
    assert "13.295" in score.framework or "RAFAM" in score.framework


def test_load_curated_transparencia_never_attributes_to_a_ministry() -> None:
    """Regression guard for the corrected owner attribution."""
    score = load_curated_transparencia(CURATED_PATH)

    assert "ministerio" not in score.source.lower()
    assert "capital humano" not in score.source_full_name.lower()
    assert "capital humano" not in score.source_type.lower()
    assert "no es un ministerio" in score.source_type.lower()


def test_load_curated_transparencia_scope_is_fiscal_not_integral() -> None:
    score = load_curated_transparencia(CURATED_PATH)

    assert "fiscal" in score.scope.lower()
    assert "no evalúa" in score.scope.lower() or "no integral" in score.scope.lower()


def test_load_curated_transparencia_has_six_dimensions() -> None:
    score = load_curated_transparencia(CURATED_PATH)

    assert len(score.dimensions) == 6
    names = {d.name for d in score.dimensions}
    assert "Acceso web fácil a la información" in names
    assert "Presupuesto vigente publicado" in names
    assert "Situación económico-financiera (SEF) trimestral" in names
    assert "Ejecución presupuestaria trimestral" in names
    assert "Gastos por finalidad y función" in names
    assert "Stock de deuda y perfil de vencimientos" in names


def test_load_curated_transparencia_dimensions_sum_to_total() -> None:
    score = load_curated_transparencia(CURATED_PATH)

    assert sum(d.got for d in score.dimensions) == score.total == 81


def test_load_curated_transparencia_trend_matches_verified_arc() -> None:
    score = load_curated_transparencia(CURATED_PATH)

    labels_totals = [(t.report_label, t.total) for t in score.trend]
    assert labels_totals == [
        ("Noviembre 2025", 70),
        ("Mayo 2026", 81),
    ]
    assert score.trend[0].category == "cumplimiento medio"
    assert score.trend[1].category == "Alto cumplimiento"


def test_load_curated_transparencia_source_refs_point_at_both_archived_reports() -> None:
    score = load_curated_transparencia(CURATED_PATH)

    assert set(score.source_refs) == {
        "asap-transparencia/informe-mayo-2026",
        "asap-transparencia/informe-noviembre-2025",
    }


def test_assert_honest_passes_for_the_real_curated_file() -> None:
    score = load_curated_transparencia(CURATED_PATH)
    assert_honest(score)  # must not raise


def test_assert_honest_raises_when_dimensions_sum_mismatches_total() -> None:
    score = load_curated_transparencia(CURATED_PATH)
    tampered = replace(score, total=score.total + 1)

    with pytest.raises(ValueError, match="honesty check failed"):
        assert_honest(tampered)


def test_assert_honest_raises_when_a_dimension_exceeds_its_own_max() -> None:
    score = load_curated_transparencia(CURATED_PATH)
    bad_dimension = replace(score.dimensions[0], got=999)
    tampered = replace(score, dimensions=[bad_dimension, *score.dimensions[1:]])

    with pytest.raises(ValueError, match="honesty check failed"):
        assert_honest(tampered)


def test_assert_honest_raises_on_every_dimension_exceeding_its_own_max() -> None:
    """Every dimension is checked, not just the first one in the list."""
    score = load_curated_transparencia(CURATED_PATH)
    bad_dimension = replace(score.dimensions[-1], got=score.dimensions[-1].max + 1)
    tampered = replace(score, dimensions=[*score.dimensions[:-1], bad_dimension])

    with pytest.raises(ValueError, match="honesty check failed"):
        assert_honest(tampered)


def test_dimension_is_a_frozen_dataclass() -> None:
    d = Dimension(name="x", got=1, max=2)
    with pytest.raises(Exception):  # noqa: B017 - FrozenInstanceError, dataclass-internal
        d.got = 5  # type: ignore[misc]
