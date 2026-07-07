"""Unit tests for coparticipacion CSV parsing and municipio filtering (task 3.2).

The fixture (`fixtures/coparticipacion_sample.csv`) is a small, real-data
excerpt cut directly from the archived
`coparticipacion/transferencias-municipios` CSV (Dec-2023 and Jan-2024 rows
for Coronel Rosales + the three comparison neighbors, plus one excluded
municipio to prove the filter works).
"""

from pathlib import Path

from etl.coparticipacion import TARGET_MUNICIPIOS, aggregate_by_period, parse_csv

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "coparticipacion_sample.csv"


def test_target_municipios_pinned_to_real_ids() -> None:
    # Pinned by inspecting the real archived CSV (task 3.2 domain note).
    assert TARGET_MUNICIPIOS == {
        "06182": "Coronel Rosales",
        "06056": "Bahía Blanca",
        "06553": "Monte Hermoso",
        "06875": "Villarino",
    }


def test_parse_csv_filters_to_target_municipios_only() -> None:
    rows = parse_csv(FIXTURE_PATH)

    municipio_ids = {row.municipio_id for row in rows}
    assert municipio_ids == set(TARGET_MUNICIPIOS)
    assert "06007" not in municipio_ids  # Adolfo Alsina, not a target municipio


def test_parse_csv_row_shape_matches_source_columns() -> None:
    rows = parse_csv(FIXTURE_PATH)

    coronel_rosales_bruta = next(
        row
        for row in rows
        if row.municipio_id == "06182"
        and row.period == "2023-12"
        and row.concepto == "Coparticipación Bruta"
    )
    assert coronel_rosales_bruta.municipio == "Coronel Rosales"
    assert coronel_rosales_bruta.monto == 410301012.51


def test_parse_csv_returns_all_rows_for_four_municipios_two_periods_three_concepts() -> None:
    rows = parse_csv(FIXTURE_PATH)

    # 4 municipios x 2 periods x 3 concepts in the fixture.
    assert len(rows) == 24


def test_aggregate_by_period_sums_all_concepts_per_municipio_and_month() -> None:
    rows = parse_csv(FIXTURE_PATH)
    totals = aggregate_by_period(rows)

    expected_06182_2023_12 = 410301012.51 + 3492197.359356272 + 5921583.54
    expected_06182_2024_01 = 537544006.99 + 1464661.22007388 + 6243093.98

    assert totals[("06182", "2023-12")] == expected_06182_2023_12
    assert totals[("06182", "2024-01")] == expected_06182_2024_01


def test_aggregate_by_period_excludes_non_target_municipio() -> None:
    rows = parse_csv(FIXTURE_PATH)
    totals = aggregate_by_period(rows)

    assert ("06007", "2023-12") not in totals
