"""Rebase the INDEC IPC series to constant pesos of the latest available month.

Per design D5, inflation adjustment is expressed in constant pesos of the
latest available IPC month ("pesos de hoy"): every earlier period's
nominal amount is multiplied by a ``factor`` (``index[base] /
index[period]``) to land in that base month's price level. This module
never touches the network -- it reads the archive already captured by
``etl archive`` (task 2.6) and rebases it deterministically (task 3.3).

Before trusting the series for adjustment math, task 3.1 requires
cross-checking it against at least one independently known published
figure -- see ``tests/test_ipc.py::test_ipc_series_matches_known_published_2024_variations``,
which compares 12 months of the archived series against widely reported
INDEC monthly variations for 2024 (all within 0.1 percentage points).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .manifest import load_manifest

IPC_MANIFEST_ID = "ipc/nivel-general-nacional"


def parse_series_tiempo_response(payload: dict[str, Any]) -> tuple[str, list[tuple[str, float]]]:
    """Extract ``(series_id, [(period "YYYY-MM", index_value), ...])``.

    ``payload`` is the datos.gob.ar series-tiempo API response shape
    (``data``: list of ``[date, value]``; ``meta[1].field.id``: series id).
    Points are returned in the same (already ascending) order as the API.
    """
    series_id = payload["meta"][1]["field"]["id"]
    points = [(date[:7], float(value)) for date, value in payload["data"]]
    return series_id, points


def monthly_variation(points: list[tuple[str, float]]) -> list[tuple[str, float]]:
    """Return month-over-month percent change, skipping the first point."""
    variations: list[tuple[str, float]] = []
    previous_value = None
    for period, value in points:
        if previous_value is not None:
            variations.append((period, (value / previous_value - 1) * 100))
        previous_value = value
    return variations


@dataclass(frozen=True)
class IpcPoint:
    period: str  # "YYYY-MM"
    index: float
    factor: float  # multiply nominal ARS of `period` to get base-month constant pesos


@dataclass(frozen=True)
class RebasedIpcSeries:
    series_id: str
    base_month: str
    data_through: str
    points: list[IpcPoint]


def rebase_to_latest(
    series_id: str,
    points: list[tuple[str, float]],
    base_month: str | None = None,
) -> RebasedIpcSeries:
    """Rebase ``points`` to constant pesos of ``base_month`` (defaults to the last period)."""
    ordered = sorted(points)
    data_through = ordered[-1][0]
    base = base_month or data_through
    index_by_period = dict(ordered)
    base_index = index_by_period[base]

    rebased_points = [
        IpcPoint(period=period, index=index, factor=base_index / index)
        for period, index in ordered
    ]
    return RebasedIpcSeries(
        series_id=series_id, base_month=base, data_through=data_through, points=rebased_points
    )


def rebased_series_from_json(payload: dict[str, Any]) -> RebasedIpcSeries:
    """Reconstruct a `RebasedIpcSeries` from a `data/ipc/ipc-nacional.json` payload.

    Lets downstream build steps (``coparticipacion.build_coparticipacion``)
    consume the pinned, versioned artifact (design D5) instead of
    recomputing the rebase from the raw archive on every run.
    """
    points = [
        IpcPoint(period=p["period"], index=p["index"], factor=p["factor"])
        for p in payload["points"]
    ]
    return RebasedIpcSeries(
        series_id=payload["seriesId"],
        base_month=payload["baseMonth"],
        data_through=payload["dataThrough"],
        points=points,
    )


def load_archived_ipc(
    manifest_path: Path, *, record_id: str = IPC_MANIFEST_ID
) -> tuple[str, list[tuple[str, float]]]:
    """Resolve the IPC manifest record and parse the archived series-tiempo JSON.

    ``archived_path`` in the manifest is always repo-root-relative (see
    ``archive.py``), and ``manifest_path`` always lives at the repo root
    (``archive-manifest.json``), so ``manifest_path.parent`` is the repo root.
    """
    records = load_manifest(manifest_path)
    record = next(r for r in records if r["id"] == record_id)
    archived_path = Path(record["archived_path"])
    if not archived_path.is_absolute():
        archived_path = manifest_path.parent / archived_path
    payload = json.loads(archived_path.read_text(encoding="utf-8"))
    return parse_series_tiempo_response(payload)


def build_ipc(
    manifest_path: Path,
    *,
    record_id: str = IPC_MANIFEST_ID,
    base_month: str | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the ``data/ipc/ipc-nacional.json`` payload."""
    series_id, points = load_archived_ipc(manifest_path, record_id=record_id)
    rebased = rebase_to_latest(series_id, points, base_month=base_month)
    generated_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "seriesId": rebased.series_id,
        "baseMonth": rebased.base_month,
        "dataThrough": rebased.data_through,
        "generatedAt": generated_at,
        "sourceRefs": [record_id],
        "points": [
            {"period": p.period, "index": p.index, "factor": p.factor} for p in rebased.points
        ],
    }
