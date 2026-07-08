"""Parse the archived provincial population-by-municipio CSV into the Censo
2022 population figure per target municipio (feature H3a,
`data/poblacion-censo-2022.json`).

**Honesty gate (task requirement)**: the H3 per-cápita coparticipación
comparison is only published if a CITABLE, ARCHIVABLE Censo 2022 population
figure exists for all four municipios (Coronel Rosales, Bahía Blanca, Monte
Hermoso, Villarino) -- see DESIGN.md's decision log entry for D8/H3. This
module is that source.

**Source**: "Población" dataset, published by the Dirección Provincial de
Estadística (Ministerio de Economía de la Provincia de Buenos Aires) on
`catalogo.datos.gba.gob.ar` -- the SAME publisher/catalog already used for
the primary `coparticipacion-viewer` source. The dataset's own CKAN notes
read (verbatim, 2026-07-08): "Datos relativos a la población de la
Provincia (Censo 2010 y Censo 2022) y su proyección. Serie: 2010-2025." --
i.e. only the `2010` and `2022` columns are actual census counts; every
other year (2011-2021, 2023-2025) is a linear interpolation/projection this
module never reads (`CENSUS_YEAR_COLUMN` pins it to `"2022"` only).

**Cross-verification (apply-time, 2026-07-08)**: Coronel Rosales's `2022`
value from this CSV (67,503) and its `2010` value (62,152) both match,
digit for digit, an independent press report (radiofm2001.com.ar,
22/11/2023, citing La Nueva / INDEC's official "datos definitivos del Censo
2022" release: "El partido de Coronel Rosales tiene 67.503 habitantes...
[en 2010] arrojó un total de 62.152 rosaleños"). Two independent sources
agreeing exactly on both data points is treated as sufficient verification
for the whole `2022` column this module reads (same parsing/column, not a
per-municipio spot check) -- per the "never fabricate, only publish what
reconciles" doctrine already established for `gasto_partida`/
`deuda_historica`.
"""

from __future__ import annotations

import csv
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .coparticipacion import TARGET_MUNICIPIOS
from .manifest import resolve_archived_path

# Manifest id for the source CSV (see etl/sources.yaml).
POBLACION_CSV_MANIFEST_ID = "poblacion-censo/proyecciones-poblacion-2010-2025"

# Pinned to the actual census count column -- see module docstring. Every
# other year column in the real source file is a projection, never read.
CENSUS_YEAR_COLUMN = "2022"


def parse_censo_2022_population(path: Path) -> dict[str, int]:
    """Read the source CSV, returning ``{municipio_id: población}`` for
    `CENSUS_YEAR_COLUMN`, filtered to `TARGET_MUNICIPIOS` (the same
    four-municipio set `coparticipacion.py` already uses, so the per-cápita
    join can never reference a municipio this module has no population
    for).
    """
    populations: dict[str, int] = {}
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            municipio_id = (raw.get("municipio_id") or "").strip()
            if municipio_id not in TARGET_MUNICIPIOS:
                continue
            raw_value = raw.get(CENSUS_YEAR_COLUMN)
            if not raw_value:
                continue
            populations[municipio_id] = int(round(float(raw_value)))
    return populations


def build_poblacion_censo_2022(
    manifest_path: Path, *, now: datetime | None = None
) -> dict[str, Any]:
    """Build the full `data/poblacion-censo-2022.json` payload.

    HONESTY GATE: raises `ValueError` (writes no file, per `cli.py`'s
    convention -- same pattern as `build_gasto_partida`) if any of the four
    target municipios is missing a population figure, rather than
    publishing a partial per-cápita source that would silently omit a
    municipio from the comparison.
    """
    csv_path = resolve_archived_path(manifest_path, POBLACION_CSV_MANIFEST_ID)
    populations = parse_censo_2022_population(csv_path)

    missing = set(TARGET_MUNICIPIOS) - set(populations)
    if missing:
        raise ValueError(
            "poblacion-censo-2022 build is missing a Censo 2022 population "
            f"figure for municipio_id(s) {sorted(missing)!r} -- refusing to "
            "publish a partial per-cápita source"
        )

    municipios = [
        {
            "municipioId": municipio_id,
            "municipio": TARGET_MUNICIPIOS[municipio_id],
            "poblacion": populations[municipio_id],
        }
        for municipio_id in TARGET_MUNICIPIOS
    ]

    generated_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "generatedAt": generated_at,
        "censusYear": 2022,
        "sourceRefs": [POBLACION_CSV_MANIFEST_ID],
        "municipios": municipios,
    }
