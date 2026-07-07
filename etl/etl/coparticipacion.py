"""Parse the archived coparticipacion CSV, filtered to Coronel Rosales + neighbors.

The source CSV (``coparticipacion/transferencias-municipios``, see
``sources.yaml``) is a long-format monthly export covering every
municipio in the province: ``anio, mes, municipio_id, municipio_nombre,
concepto, monto``. This module filters it down to Coronel Rosales and
its three comparison neighbors and aggregates every concepto into one
total monthly transfer per municipio -- the headline figure a resident
compares across municipios (task 3.2). Inflation adjustment is added on
top of this in a later step (task 3.4).
"""

from __future__ import annotations

import csv
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .ipc import RebasedIpcSeries

# Pinned by inspecting the real archived CSV (see apply-progress, task 3.2):
# Coronel Rosales is municipio_id 06182; comparison neighbors resolved by
# municipio_nombre in the same CSV export.
TARGET_MUNICIPIOS: dict[str, str] = {
    "06182": "Coronel Rosales",
    "06056": "Bahía Blanca",
    "06553": "Monte Hermoso",
    "06875": "Villarino",
}

# The CSV's own municipio_nombre spells out the municipio's full legal name;
# TARGET_MUNICIPIOS above holds the shorter, UI-facing label instead.
CORONEL_ROSALES_ID = "06182"


@dataclass(frozen=True)
class CoparticipacionRow:
    """One (municipio, month, concepto) line from the source CSV."""

    municipio_id: str
    municipio: str
    period: str  # "YYYY-MM"
    concepto: str
    monto: float


def parse_csv(
    path: Path, municipio_ids: Iterable[str] = TARGET_MUNICIPIOS
) -> list[CoparticipacionRow]:
    """Read the source CSV, keeping only rows for ``municipio_ids``.

    ``municipio`` on the returned rows is the short UI-facing label from
    ``TARGET_MUNICIPIOS`` (not the CSV's ``municipio_nombre``, which spells
    out Coronel Rosales's full legal name).
    """
    wanted = set(municipio_ids)
    rows: list[CoparticipacionRow] = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            municipio_id = raw["municipio_id"]
            if municipio_id not in wanted:
                continue
            period = f"{int(raw['anio']):04d}-{int(raw['mes']):02d}"
            rows.append(
                CoparticipacionRow(
                    municipio_id=municipio_id,
                    municipio=TARGET_MUNICIPIOS.get(municipio_id, raw["municipio_nombre"]),
                    period=period,
                    concepto=raw["concepto"],
                    monto=float(raw["monto"]),
                )
            )
    return rows


def aggregate_by_period(rows: Iterable[CoparticipacionRow]) -> dict[tuple[str, str], float]:
    """Sum ``monto`` across every concepto, grouped by ``(municipio_id, period)``.

    This total monthly transfer -- not any single concepto like
    "Coparticipación Bruta" -- is the headline figure the viewer compares
    across municipios (design D6 `/coparticipacion` route).
    """
    totals: dict[tuple[str, str], float] = {}
    for row in rows:
        key = (row.municipio_id, row.period)
        totals[key] = totals.get(key, 0.0) + row.monto
    return totals


def build_series(
    rows: Iterable[CoparticipacionRow],
    ipc: RebasedIpcSeries,
    *,
    municipio_ids: Iterable[str] = TARGET_MUNICIPIOS,
) -> list[dict[str, Any]]:
    """Join monthly totals with the IPC rebase factor (task 3.4).

    Only periods present in *both* the coparticipacion data and the IPC
    series are emitted -- per the freshness-disclosure requirement, a
    period absent from the source data (not yet published) is simply
    omitted, never synthesized as a zero (task 3.6).
    """
    totals = aggregate_by_period(rows)
    ipc_factor_by_period = {point.period: point.factor for point in ipc.points}

    series: list[dict[str, Any]] = []
    for municipio_id in municipio_ids:
        points = []
        for (mid, period), nominal in sorted(totals.items()):
            if mid != municipio_id:
                continue
            factor = ipc_factor_by_period.get(period)
            if factor is None:
                continue  # outside the IPC series range -- not fabricated
            points.append(
                {
                    "period": period,
                    "nominalArs": nominal,
                    "realArs": nominal * factor,
                }
            )
        series.append(
            {
                "municipioId": municipio_id,
                "municipio": TARGET_MUNICIPIOS[municipio_id],
                "baseMonth": ipc.base_month,
                "points": points,
                "sourceRefs": ["coparticipacion/transferencias-municipios"],
            }
        )
    return series
