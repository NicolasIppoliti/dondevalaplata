"""Unit tests for Censo 2022 population parsing (feature H3a).

The fixture (`fixtures/poblacion_censo_sample.csv`) is a small, real-data
excerpt cut directly from the archived
`poblacion-censo/proyecciones-poblacion-2010-2025` CSV (Dirección
Provincial de Estadística, Provincia de Buenos Aires): the "Total"
provincial row, the six target municipios (Coronel Rosales, Bahía Blanca,
Monte Hermoso, Villarino, and the same-size peers Coronel Suárez and Tres
Arroyos), and one excluded municipio (Adolfo Alsina) to prove the filter
works. Only the `2010` and `2022` columns are kept -- `2022` is the actual
Censo Nacional de Población, Hogares y Viviendas 2022 count (see the
dataset's own CKAN notes: "Datos relativos a la población de la Provincia
(Censo 2010 y Censo 2022) y su proyección"), every other year in the real
file is a linear interpolation/projection this build never reads.
"""

from pathlib import Path

from etl.coparticipacion import TARGET_MUNICIPIOS
from etl.poblacion import CENSUS_YEAR_COLUMN, parse_censo_2022_population

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "poblacion_censo_sample.csv"


def test_census_year_column_is_2022() -> None:
    assert CENSUS_YEAR_COLUMN == "2022"


def test_parse_censo_2022_population_filters_to_target_municipios_only() -> None:
    populations = parse_censo_2022_population(FIXTURE_PATH)

    assert set(populations) == set(TARGET_MUNICIPIOS)
    assert "06007" not in populations  # Adolfo Alsina, not a target municipio
    assert "06" not in populations  # provincial "Total" row, not a municipio


def test_parse_censo_2022_population_known_real_values() -> None:
    # Live-verified (2026-07-08) against the real archived CSV. Coronel
    # Rosales's figure independently cross-checked digit-for-digit against
    # a press report citing INDEC's official "datos definitivos del Censo
    # 2022" release (radiofm2001.com.ar, 22/11/2023) -- see
    # etl/sources.yaml's poblacion-censo notes.
    populations = parse_censo_2022_population(FIXTURE_PATH)

    assert populations["06182"] == 67503  # Coronel Rosales
    assert populations["06056"] == 336557  # Bahía Blanca
    assert populations["06553"] == 8465  # Monte Hermoso
    assert populations["06875"] == 32717  # Villarino
    assert populations["06203"] == 42110  # Coronel Suárez
    assert populations["06833"] == 62426  # Tres Arroyos


def test_parse_censo_2022_population_returns_ints_not_floats() -> None:
    populations = parse_censo_2022_population(FIXTURE_PATH)

    for value in populations.values():
        assert isinstance(value, int)
