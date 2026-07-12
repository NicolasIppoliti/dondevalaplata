"""Unit tests for coparticipacion CSV parsing and municipio filtering (task 3.2).

The fixture (`fixtures/coparticipacion_sample.csv`) is a small, real-data
excerpt cut directly from the archived
`coparticipacion/transferencias-municipios` CSV (Dec-2023 and Jan-2024 rows
for Coronel Rosales + the five comparison municipios -- Bahía Blanca, Monte
Hermoso, Villarino, and the same-size peers Coronel Suárez and Tres Arroyos
-- plus one excluded municipio to prove the filter works).
"""

from pathlib import Path

from etl.coparticipacion import TARGET_MUNICIPIOS, aggregate_by_period, build_series, parse_csv
from etl.ipc import rebase_to_latest

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "coparticipacion_sample.csv"


def test_target_municipios_pinned_to_real_ids() -> None:
    # Pinned by inspecting the real archived CSV (task 3.2 domain note).
    assert TARGET_MUNICIPIOS == {
        "06182": "Coronel Rosales",
        "06056": "Bahía Blanca",
        "06553": "Monte Hermoso",
        "06875": "Villarino",
        "06203": "Coronel Suárez",
        "06833": "Tres Arroyos",
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


def test_parse_csv_maps_same_size_peer_municipios_to_their_short_labels() -> None:
    # Coronel Suárez (06203) and Tres Arroyos (06833) were added as
    # same-size population peers to Coronel Rosales (D8/H3a decision log).
    rows = parse_csv(FIXTURE_PATH)

    coronel_suarez = next(
        row for row in rows if row.municipio_id == "06203" and row.period == "2023-12"
    )
    tres_arroyos = next(
        row for row in rows if row.municipio_id == "06833" and row.period == "2023-12"
    )
    assert coronel_suarez.municipio == "Coronel Suárez"
    assert tres_arroyos.municipio == "Tres Arroyos"


def test_parse_csv_returns_all_rows_for_six_municipios_two_periods_three_concepts() -> None:
    rows = parse_csv(FIXTURE_PATH)

    # 6 municipios x 2 periods x 3 concepts in the fixture.
    assert len(rows) == 36


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


def test_build_series_joins_nominal_and_real_ars_matching_manual_calc() -> None:
    # Real IPC index values for the two periods covered by the fixture
    # (cut from the archived series), rebased to the latest month.
    ipc = rebase_to_latest(
        "148.3_INIVELNAL_DICI_M_26",
        [("2023-12", 3533.1922), ("2024-01", 4261.5324)],
        base_month="2024-01",
    )
    rows = parse_csv(FIXTURE_PATH)

    series = build_series(rows, ipc)

    coronel_rosales = next(s for s in series if s["municipioId"] == "06182")
    points_by_period = {p["period"]: p for p in coronel_rosales["points"]}

    expected_nominal_dec_2023 = 410301012.51 + 3492197.359356272 + 5921583.54
    expected_factor_dec_2023 = 4261.5324 / 3533.1922
    dec_2023 = points_by_period["2023-12"]
    assert dec_2023["nominalArs"] == expected_nominal_dec_2023
    assert dec_2023["realArs"] == expected_nominal_dec_2023 * expected_factor_dec_2023

    # Base month itself: real == nominal (factor 1.0).
    expected_nominal_jan_2024 = 537544006.99 + 1464661.22007388 + 6243093.98
    jan_2024 = points_by_period["2024-01"]
    assert jan_2024["nominalArs"] == expected_nominal_jan_2024
    assert jan_2024["realArs"] == expected_nominal_jan_2024


def test_build_series_covers_all_target_municipios() -> None:
    ipc = rebase_to_latest(
        "148.3_INIVELNAL_DICI_M_26",
        [("2023-12", 3533.1922), ("2024-01", 4261.5324)],
        base_month="2024-01",
    )
    rows = parse_csv(FIXTURE_PATH)

    series = build_series(rows, ipc)

    assert {s["municipioId"] for s in series} == set(TARGET_MUNICIPIOS)
    for one_series in series:
        assert len(one_series["points"]) == 2  # 2023-12 and 2024-01
        assert one_series["baseMonth"] == "2024-01"
        assert one_series["sourceRefs"] == ["coparticipacion/transferencias-municipios"]
