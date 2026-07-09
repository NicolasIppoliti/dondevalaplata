"""Integration tests for `build_titularidad`: data/titularidad.json.

Exercises the full build over the real curated source
(`etl/titularidad.yaml`), asserting the envelope shape AND the REQUIRED
minimization invariant: every socio dict crossing the build-time JSON
boundary carries ONLY `nombre` + `rol`, never anything else.
"""

from datetime import UTC, datetime
from pathlib import Path

from etl.titularidad import build_titularidad

REPO_ROOT = Path(__file__).resolve().parents[2]
CURATED_PATH = REPO_ROOT / "etl" / "titularidad.yaml"
FIXED_NOW = datetime(2026, 7, 9, 12, 0, 0, tzinfo=UTC)


def _result() -> dict:
    return build_titularidad(CURATED_PATH, now=FIXED_NOW)


def test_build_titularidad_envelope_shape() -> None:
    result = _result()

    assert result["generatedAt"] == "2026-07-09T12:00:00Z"
    assert result["sourceRefs"] == ["edictos-societarios/rumax"]
    assert len(result["records"]) == 1

    rumax = result["records"][0]
    assert rumax["empresa"] == "Equipo de Servicios Portuarios Rumax S.R.L."
    assert rumax["vendorMatchKeys"] == [
        "EQUIPO DE SERVICIOS PORTUARIOS RUMAX S.R.L",
        "EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L",
    ]
    assert rumax["tipo"] == "S.R.L."
    assert rumax["cuitEmpresa"] is None
    assert rumax["edicionFecha"] == "2023-07-18"
    assert rumax["instrumentoFecha"] == "2023-06-29"
    assert rumax["sourceRef"] == "edictos-societarios/rumax"


def test_build_titularidad_rumax_socios_and_roles() -> None:
    result = _result()
    rumax = result["records"][0]

    assert rumax["socios"] == [
        {"nombre": "Juan Esteban Iglesias", "rol": "socio gerente"},
        {"nombre": "Maximiliano Marcelo Márquez", "rol": "socio"},
    ]


def test_build_titularidad_minimization_invariant_every_socio_has_only_nombre_and_rol() -> (
    None
):
    """REQUIRED (legal minimization guardrail): no socio dict may EVER carry
    a key other than nombre/rol, across every record in the real build --
    this is the integrity guarantee behind the whole feature.
    """
    result = _result()

    assert len(result["records"]) > 0  # the loop below must actually execute
    for record in result["records"]:
        assert len(record["socios"]) > 0
        for socio in record["socios"]:
            assert set(socio.keys()) == {"nombre", "rol"}
