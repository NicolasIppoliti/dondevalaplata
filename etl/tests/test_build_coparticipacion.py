"""Integration test for `etl build-coparticipacion` (tasks 3.5, 3.6, 3.7).

Exercises the full pipeline (parse -> aggregate -> join -> assemble) over
the small real-data fixture CSV, asserting the final
`data/coparticipacion.json` shape and the freshness/no-false-zero
invariant: a month absent from the source CSV must never appear as a
zero-valued point.
"""

from datetime import UTC, datetime
from pathlib import Path

from etl.coparticipacion import TARGET_MUNICIPIOS, build_coparticipacion
from etl.ipc import rebase_to_latest

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "coparticipacion_sample.csv"
FIXED_NOW = datetime(2026, 7, 7, 12, 0, 0, tzinfo=UTC)


def _real_ipc_two_periods(base_month: str = "2024-01"):
    return rebase_to_latest(
        "148.3_INIVELNAL_DICI_M_26",
        [("2023-12", 3533.1922), ("2024-01", 4261.5324)],
        base_month=base_month,
    )


def test_build_coparticipacion_shape_and_metadata() -> None:
    ipc = _real_ipc_two_periods()

    result = build_coparticipacion(FIXTURE_PATH, ipc, now=FIXED_NOW)

    assert result["generatedAt"] == "2026-07-07T12:00:00Z"
    assert result["dataThrough"] == "2024-01"
    assert result["ipcSeriesId"] == "148.3_INIVELNAL_DICI_M_26"
    assert result["baseMonth"] == "2024-01"
    assert "coparticipacion/transferencias-municipios" in result["sourceRefs"]
    assert "ipc/nivel-general-nacional" in result["sourceRefs"]
    assert isinstance(result["lagNote"], str) and result["lagNote"]

    municipio_ids = {s["municipioId"] for s in result["series"]}
    assert municipio_ids == set(TARGET_MUNICIPIOS)


def test_build_coparticipacion_never_fabricates_a_zero_for_an_unpublished_month() -> None:
    # IPC series extends one month past the coparticipacion CSV's actual
    # data (2024-02 has an index value but no corresponding CSV rows in
    # the fixture) -- this must NOT produce a zero-valued 2024-02 point.
    ipc = rebase_to_latest(
        "148.3_INIVELNAL_DICI_M_26",
        [("2023-12", 3533.1922), ("2024-01", 4261.5324), ("2024-02", 4825.7881)],
        base_month="2024-02",
    )

    result = build_coparticipacion(FIXTURE_PATH, ipc, now=FIXED_NOW)

    assert result["dataThrough"] == "2024-01"  # latest month actually present in the CSV
    for one_series in result["series"]:
        periods = [p["period"] for p in one_series["points"]]
        assert "2024-02" not in periods
        for point in one_series["points"]:
            assert point["nominalArs"] > 0  # never a fabricated zero


def test_build_coparticipacion_points_sorted_chronologically() -> None:
    ipc = _real_ipc_two_periods()

    result = build_coparticipacion(FIXTURE_PATH, ipc, now=FIXED_NOW)

    for one_series in result["series"]:
        periods = [p["period"] for p in one_series["points"]]
        assert periods == sorted(periods)
