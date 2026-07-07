"""Unit tests for INDEC IPC parsing, rebase math, and the VERIFY-AT-APPLY
cross-check against known published monthly variations (tasks 3.1, 3.3).

``fixtures/ipc_sample.json`` is a 3-point excerpt cut directly from the
real archived series-tiempo response
(``archive/ipc/ipc-nivel-general-nacional.json``). The known-value
cross-check test additionally reads the FULL real archived file to
verify the series itself, per task 3.1 ("VERIFY-AT-APPLY, do FIRST").
"""

import json
from pathlib import Path

from etl.ipc import (
    build_ipc,
    monthly_variation,
    parse_series_tiempo_response,
    rebase_to_latest,
    rebased_series_from_json,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "ipc_sample.json"
REPO_ROOT = Path(__file__).resolve().parents[2]
REAL_ARCHIVED_IPC_PATH = REPO_ROOT / "archive" / "ipc" / "ipc-nivel-general-nacional.json"

# Well-established, independently published INDEC "IPC Nivel General
# Nacional" monthly (m/m) variations for calendar year 2024 -- used to
# cross-check that series id 148.3_INIVELNAL_DICI_M_26 is the correct
# series and that the datos.gob.ar series-tiempo API returns plausible
# values, per task 3.1's VERIFY-AT-APPLY gate.
KNOWN_PUBLISHED_MONTHLY_VARIATIONS_2024 = {
    "2024-01": 20.6,
    "2024-02": 13.2,
    "2024-03": 11.0,
    "2024-04": 8.8,
    "2024-05": 4.2,
    "2024-06": 4.6,
    "2024-07": 4.0,
    "2024-08": 4.2,
    "2024-09": 3.5,
    "2024-10": 2.7,
    "2024-11": 2.4,
    "2024-12": 2.7,
}


def test_parse_series_tiempo_response_extracts_series_id_and_points() -> None:
    payload = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    series_id, points = parse_series_tiempo_response(payload)

    assert series_id == "148.3_INIVELNAL_DICI_M_26"
    assert points == [
        ("2023-12", 3533.1922),
        ("2024-01", 4261.5324),
        ("2024-02", 4825.7881),
    ]


def test_monthly_variation_skips_first_point_and_computes_pct_change() -> None:
    points = [("2023-12", 3533.1922), ("2024-01", 4261.5324), ("2024-02", 4825.7881)]

    variations = monthly_variation(points)

    assert [period for period, _ in variations] == ["2024-01", "2024-02"]
    jan_pct = dict(variations)["2024-01"]
    assert round(jan_pct, 2) == 20.61


def test_ipc_series_matches_known_published_2024_variations() -> None:
    """task 3.1 VERIFY-AT-APPLY: cross-check the archived series against
    independently known published INDEC figures before trusting it for
    the adjustment math. Tolerance of 0.1 percentage points absorbs
    rounding between INDEC's press-release rounding and our own.
    """
    payload = json.loads(REAL_ARCHIVED_IPC_PATH.read_text(encoding="utf-8"))
    _, points = parse_series_tiempo_response(payload)
    variations = dict(monthly_variation(points))

    mismatches = []
    for period, expected_pct in KNOWN_PUBLISHED_MONTHLY_VARIATIONS_2024.items():
        actual_pct = variations[period]
        if abs(actual_pct - expected_pct) > 0.1:
            mismatches.append((period, expected_pct, actual_pct))

    assert not mismatches, f"IPC series diverges from known published figures: {mismatches}"


def test_rebase_to_latest_defaults_base_month_to_last_period() -> None:
    points = [("2024-01", 100.0), ("2024-02", 110.0), ("2024-03", 121.0)]

    rebased = rebase_to_latest("test-series", points)

    assert rebased.series_id == "test-series"
    assert rebased.base_month == "2024-03"
    assert rebased.data_through == "2024-03"
    factors = {p.period: p.factor for p in rebased.points}
    assert factors["2024-01"] == 1.21
    assert factors["2024-02"] == 1.1
    assert factors["2024-03"] == 1.0


def test_rebase_to_latest_accepts_explicit_base_month() -> None:
    points = [("2024-01", 100.0), ("2024-02", 110.0), ("2024-03", 121.0)]

    rebased = rebase_to_latest("test-series", points, base_month="2024-01")

    factors = {p.period: p.factor for p in rebased.points}
    assert factors["2024-01"] == 1.0
    assert round(factors["2024-02"], 10) == round(100.0 / 110.0, 10)
    assert round(factors["2024-03"], 10) == round(100.0 / 121.0, 10)


def test_build_ipc_writes_expected_shape_from_manifest(tmp_path) -> None:
    fixture_payload = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    archive_dir = tmp_path / "archive" / "ipc"
    archive_dir.mkdir(parents=True)
    archived_file = archive_dir / "ipc-nivel-general-nacional.json"
    archived_file.write_text(json.dumps(fixture_payload), encoding="utf-8")

    manifest_path = tmp_path / "archive-manifest.json"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": "ipc/nivel-general-nacional",
                    "capability": "ipc",
                    "archived_path": "archive/ipc/ipc-nivel-general-nacional.json",
                    "status": "ok",
                }
            ]
        ),
        encoding="utf-8",
    )

    result = build_ipc(manifest_path)

    assert result["seriesId"] == "148.3_INIVELNAL_DICI_M_26"
    assert result["baseMonth"] == "2024-02"
    assert result["dataThrough"] == "2024-02"
    assert result["sourceRefs"] == ["ipc/nivel-general-nacional"]
    factors = {p["period"]: p["factor"] for p in result["points"]}
    assert factors["2024-02"] == 1.0


def test_rebased_series_from_json_round_trips_build_ipc_output(tmp_path) -> None:
    fixture_payload = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    archive_dir = tmp_path / "archive" / "ipc"
    archive_dir.mkdir(parents=True)
    (archive_dir / "ipc-nivel-general-nacional.json").write_text(
        json.dumps(fixture_payload), encoding="utf-8"
    )
    manifest_path = tmp_path / "archive-manifest.json"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": "ipc/nivel-general-nacional",
                    "capability": "ipc",
                    "archived_path": "archive/ipc/ipc-nivel-general-nacional.json",
                    "status": "ok",
                }
            ]
        ),
        encoding="utf-8",
    )

    payload = build_ipc(manifest_path)
    rebased = rebased_series_from_json(payload)

    assert rebased.series_id == payload["seriesId"]
    assert rebased.base_month == payload["baseMonth"]
    assert rebased.data_through == payload["dataThrough"]
    assert len(rebased.points) == len(payload["points"])
