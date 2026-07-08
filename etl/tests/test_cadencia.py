"""Unit tests for `etl.cadencia`: live cadence derivation per ASAP dimension.

Covers the pure helpers (`normalize`, `matches_document`, `latest_matching`,
`months_between`), the curated overlay loader, per-dimension derivation
(including the two-sub-series "Ejecución presupuestaria trimestral" case and
the live-drift tripwire), the deuda-counter derivation, and the REQUIRED
honesty invariant carried over from `etl.transparencia`.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from etl.cadencia import (
    assert_honest_cadencia,
    derive_deuda_cadence,
    derive_dimension_cadence,
    latest_matching,
    load_curated_cadencia,
    matches_document,
    months_between,
    normalize,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
CADENCIA_CURATED_PATH = REPO_ROOT / "etl" / "cadencia.yaml"
FIXTURE_DOCUMENTOS = json.loads(
    (Path(__file__).parent / "fixtures" / "cadencia_documentos_sample.json").read_text(
        encoding="utf-8"
    )
)
FIXED_NOW = datetime(2026, 7, 8, 12, 0, 0, tzinfo=UTC)


def test_normalize_lowercases_and_strips_accents() -> None:
    assert normalize("Ejecución Presupuestaria") == "ejecucion presupuestaria"
    assert normalize("FINALIDAD Y FUNCIÓN") == "finalidad y funcion"


def test_matches_document_true_on_keyword_hit() -> None:
    title = "STOCK DE DEUDA Y PERFIL DE VENCIMIENTOS 3º TRIMESTRE"
    assert matches_document(title, ["stock de deuda"])


def test_matches_document_false_when_no_keyword_matches() -> None:
    assert not matches_document("Talleres culturales", ["stock de deuda"])


def test_matches_document_respects_exclude_keywords() -> None:
    title = "Estado de Ejecución Presupuestaria de Gastos por finalidad y función 4to Trimestre"
    assert not matches_document(
        title, ["ejecución presupuestaria de gastos"], exclude_keywords=["finalidad y función"]
    )


def test_latest_matching_returns_the_most_recent_match() -> None:
    doc = latest_matching(FIXTURE_DOCUMENTOS, ["stock de deuda"])
    assert doc is not None
    assert doc["slug"] == "stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre"


def test_latest_matching_returns_none_when_nothing_matches() -> None:
    assert latest_matching(FIXTURE_DOCUMENTOS, ["no-existe-esta-serie"]) is None


@pytest.mark.parametrize(
    "earlier,later,expected",
    [
        (datetime(2026, 4, 15), datetime(2026, 7, 8), 2),
        (datetime(2025, 9, 30), datetime(2026, 7, 8), 9),
        (datetime(2026, 1, 1), datetime(2026, 1, 1), 0),
        (datetime(2026, 1, 31), datetime(2026, 2, 1), 0),
    ],
)
def test_months_between_whole_months_elapsed(earlier, later, expected) -> None:
    assert months_between(earlier, later) == expected


def test_load_curated_cadencia_has_six_dimensions_and_a_deuda_block() -> None:
    config = load_curated_cadencia(CADENCIA_CURATED_PATH)

    assert config.asap_report == "Mayo 2026"
    assert len(config.dimensions) == 6
    assert config.deuda.last_period_label == "3er trimestre 2025"
    assert config.deuda.last_figure_ars == pytest.approx(46876896.86)


def test_derive_dimension_cadence_single_series_gap_dimension() -> None:
    config = load_curated_cadencia(CADENCIA_CURATED_PATH)
    asap_dims_by_name = {"Gastos por finalidad y función": (3, 10)}
    dim_config = next(
        d for d in config.dimensions if d.name == "Gastos por finalidad y función"
    )

    result = derive_dimension_cadence(
        dim_config, FIXTURE_DOCUMENTOS, asap_dims_by_name, now=FIXED_NOW
    )

    assert result["name"] == "Gastos por finalidad y función"
    assert result["got"] == 3
    assert result["max"] == 10
    assert "4to Trimestre" in result["lastPeriodPublished"]
    assert result["lagMonths"] == 2  # 2026-04-15 -> 2026-07-08
    assert "rezago" in result["reason"].lower()
    assert "+7" in result["toReach10"]
    assert result["sourceRefs"] == [
        "mcr-docs/estado-de-ejecucion-presupuestaria-de-gastos-por-finalidad-y-funcion-4to-trimestre"
    ]


def test_derive_dimension_cadence_sub_series_combines_both_labels() -> None:
    config = load_curated_cadencia(CADENCIA_CURATED_PATH)
    asap_dims_by_name = {"Ejecución presupuestaria trimestral": (5, 10)}
    dim_config = next(
        d for d in config.dimensions if d.name == "Ejecución presupuestaria trimestral"
    )

    result = derive_dimension_cadence(
        dim_config, FIXTURE_DOCUMENTOS, asap_dims_by_name, now=FIXED_NOW
    )

    assert "Ejecución de Gastos" in result["lastPeriodPublished"]
    assert "1º Trimestre" in result["lastPeriodPublished"]
    assert "Ejecución de Recursos" in result["lastPeriodPublished"]
    assert "4to Trimestre" in result["lastPeriodPublished"]
    assert result["lagMonths"] == 2
    assert len(result["sourceRefs"]) == 2


def test_derive_dimension_cadence_full_mark_dimension_has_no_period_when_no_keywords() -> None:
    config = load_curated_cadencia(CADENCIA_CURATED_PATH)
    asap_dims_by_name = {"Acceso web fácil a la información": (5, 5)}
    dim_config = next(
        d for d in config.dimensions if d.name == "Acceso web fácil a la información"
    )

    result = derive_dimension_cadence(
        dim_config, FIXTURE_DOCUMENTOS, asap_dims_by_name, now=FIXED_NOW
    )

    assert result["lastPeriodPublished"] is None
    assert result["lagMonths"] is None
    assert result["sourceRefs"] == []


def test_derive_dimension_cadence_raises_when_asap_dimension_name_is_missing() -> None:
    config = load_curated_cadencia(CADENCIA_CURATED_PATH)
    dim_config = next(
        d for d in config.dimensions if d.name == "Gastos por finalidad y función"
    )

    with pytest.raises(ValueError, match="Gastos por finalidad y función"):
        derive_dimension_cadence(dim_config, FIXTURE_DOCUMENTOS, {}, now=FIXED_NOW)


def test_derive_dimension_cadence_raises_when_live_period_drifted_from_curated_text() -> None:
    """Tripwire: if the freshest live document no longer matches the period
    the curated `reason`/`to_reach_10` prose describes, the build must fail
    loudly instead of silently pairing stale prose with fresher live data.
    """
    config = load_curated_cadencia(CADENCIA_CURATED_PATH)
    asap_dims_by_name = {"Stock de deuda y perfil de vencimientos": (3, 10)}
    dim_config = next(
        d for d in config.dimensions if d.name == "Stock de deuda y perfil de vencimientos"
    )
    drifted_documentos = [
        *FIXTURE_DOCUMENTOS,
        {
            "date": "2026-05-01T00:00:00",
            "slug": "stock-de-deuda-y-perfil-de-vencimientos-4to-trimestre",
            "title": {"rendered": "STOCK DE DEUDA Y PERFIL DE VENCIMIENTOS 4to TRIMESTRE"},
            "link": "https://mcr.gob.ar/documentos/stock-de-deuda-y-perfil-de-vencimientos-4to-trimestre/",
        },
    ]

    with pytest.raises(ValueError, match="re-curate"):
        derive_dimension_cadence(
            dim_config, drifted_documentos, asap_dims_by_name, now=FIXED_NOW
        )


def test_derive_deuda_cadence_happy_path() -> None:
    config = load_curated_cadencia(CADENCIA_CURATED_PATH)

    result = derive_deuda_cadence(config.deuda, FIXTURE_DOCUMENTOS, now=FIXED_NOW)

    assert result["lastPeriod"] == "3er trimestre 2025"
    assert result["lastFigureArs"] == pytest.approx(46876896.86)
    assert result["quartersMissing"] == 3  # Q4-2025, Q1-2026, Q2-2026 closed since 30/09/2025
    assert result["elapsedDays"] > 0
    assert result["sourceRefs"] == [
        "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre"
    ]


def test_derive_deuda_cadence_raises_when_a_newer_document_is_live() -> None:
    config = load_curated_cadencia(CADENCIA_CURATED_PATH)
    documentos_with_newer_deuda = [
        *FIXTURE_DOCUMENTOS,
        {
            "date": "2026-05-01T00:00:00",
            "slug": "stock-de-deuda-y-perfil-de-vencimientos-4to-trimestre",
            "title": {"rendered": "STOCK DE DEUDA Y PERFIL DE VENCIMIENTOS 4to TRIMESTRE"},
            "link": "https://mcr.gob.ar/documentos/stock-de-deuda-y-perfil-de-vencimientos-4to-trimestre/",
        },
    ]

    with pytest.raises(ValueError, match="re-curate"):
        derive_deuda_cadence(config.deuda, documentos_with_newer_deuda, now=FIXED_NOW)


def test_assert_honest_cadencia_passes_when_sum_matches_total() -> None:
    dimensions = [{"got": 5, "max": 10}, {"got": 76, "max": 90}]
    assert_honest_cadencia(dimensions, expected_total=81)  # must not raise


def test_assert_honest_cadencia_raises_when_sum_mismatches_total() -> None:
    dimensions = [{"got": 5, "max": 10}, {"got": 70, "max": 90}]
    with pytest.raises(ValueError, match="honesty check failed"):
        assert_honest_cadencia(dimensions, expected_total=81)


def test_assert_honest_cadencia_raises_when_a_dimension_exceeds_its_own_max() -> None:
    dimensions = [{"got": 11, "max": 10}, {"got": 70, "max": 90}]
    with pytest.raises(ValueError, match="honesty check failed"):
        assert_honest_cadencia(dimensions, expected_total=81)
