"""Integration test for `build_poblacion_censo_2022` (feature H3a):
data/poblacion-censo-2022.json.

Exercises the full pipeline over the REAL archived population CSV (via a
temp manifest pointing at the real file).
"""

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from etl.coparticipacion import TARGET_MUNICIPIOS
from etl.poblacion import POBLACION_CSV_MANIFEST_ID, build_poblacion_censo_2022

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXED_NOW = datetime(2026, 7, 8, 12, 0, 0, tzinfo=UTC)
_REAL_CSV = REPO_ROOT / "archive" / "poblacion-censo" / "proyecciones-poblacion-2010-2025.csv"

# The archive isn't git-versioned by design (R2 is the canonical store, see
# design D3/W1) -- skip the whole module on a fresh clone/CI runner instead
# of erroring on a missing file. Checking the REAL local blob's `.exists()`
# (never just the committed manifest's "ok" status) -- same CI-hygiene rule
# as test_build_gasto_partida.py / test_build_deuda_historica.py.
pytestmark = pytest.mark.skipif(
    not _REAL_CSV.exists(),
    reason=(
        "requires the locally archived poblacion-censo CSV, which is not "
        "git-versioned by design (R2 is the canonical archive store) -- run "
        "`uv run etl archive --capability poblacion-censo` locally to "
        "populate it"
    ),
)


def _write_manifest(manifest_path: Path) -> None:
    records = [
        {
            "id": POBLACION_CSV_MANIFEST_ID,
            "capability": "poblacion-censo",
            "archived_path": str(_REAL_CSV),
            "status": "ok",
        }
    ]
    manifest_path.write_text(json.dumps(records), encoding="utf-8")


@pytest.fixture
def result(tmp_path: Path) -> dict:
    manifest_path = tmp_path / "archive-manifest.json"
    _write_manifest(manifest_path)
    return build_poblacion_censo_2022(manifest_path, now=FIXED_NOW)


def test_build_poblacion_envelope_shape(result: dict) -> None:
    assert result["generatedAt"] == "2026-07-08T12:00:00Z"
    assert result["censusYear"] == 2022
    assert result["sourceRefs"] == [POBLACION_CSV_MANIFEST_ID]
    assert len(result["municipios"]) == 6


def test_build_poblacion_covers_all_target_municipios(result: dict) -> None:
    municipio_ids = {m["municipioId"] for m in result["municipios"]}
    assert municipio_ids == set(TARGET_MUNICIPIOS)


def test_build_poblacion_known_real_values(result: dict) -> None:
    # Live-verified (2026-07-08) against the real archived CSV -- see
    # etl/etl/poblacion.py's module docstring for the cross-verification
    # note. Coronel Suárez / Tres Arroyos added later as same-size
    # population peers to Coronel Rosales (D8/H3a decision log).
    by_id = {m["municipioId"]: m["poblacion"] for m in result["municipios"]}
    assert by_id["06182"] == 67503  # Coronel Rosales
    assert by_id["06056"] == 336557  # Bahía Blanca
    assert by_id["06553"] == 8465  # Monte Hermoso
    assert by_id["06875"] == 32717  # Villarino
    assert by_id["06203"] == 42110  # Coronel Suárez
    assert by_id["06833"] == 62426  # Tres Arroyos
