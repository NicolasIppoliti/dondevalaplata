"""Unit tests for the curated "titularidad registral" source
(etl.titularidad) -- the highest legal-risk data this portal publishes.

Covers: loading the real curated RUMAX record, the MINIMIZATION guard
(forbidden PII fields must raise, never silently pass through) and the
allowed-role guard, against both the real `etl/titularidad.yaml` and
synthetic fixtures (so the loader is proven to generalize, not just
hardcoded to the one real record).
"""

from pathlib import Path

import pytest

from etl.titularidad import (
    ALLOWED_ROLES,
    FORBIDDEN_SOCIO_FIELDS,
    load_curated_titularidad,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
TITULARIDAD_PATH = REPO_ROOT / "etl" / "titularidad.yaml"


def _write_yaml(tmp_path: Path, content: str) -> Path:
    path = tmp_path / "titularidad.yaml"
    path.write_text(content, encoding="utf-8")
    return path


def test_load_curated_titularidad_reads_the_real_rumax_record() -> None:
    fichas = load_curated_titularidad(TITULARIDAD_PATH)

    assert len(fichas) == 1
    rumax = fichas[0]
    assert rumax.empresa_edicto == "Equipo de Servicios Portuarios Rumax S.R.L."
    assert rumax.tipo == "S.R.L."
    assert rumax.cuit_empresa is None
    assert rumax.vendor_match_keys == [
        "EQUIPO DE SERVICIOS PORTUARIOS RUMAX S.R.L",
        "EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L",
    ]
    assert rumax.socios == [
        {"nombre": "Juan Esteban Iglesias", "rol": "socio gerente"},
        {"nombre": "Maximiliano Marcelo Márquez", "rol": "socio"},
    ]
    assert rumax.edicion_fecha == "2023-07-18"
    assert rumax.instrumento_fecha == "2023-06-29"
    assert rumax.source_ref == "edictos-societarios/rumax"


def test_load_curated_titularidad_generalizes_to_a_second_synthetic_record(
    tmp_path,
) -> None:
    """Triangulation: proves the loader is real list-handling logic, not a
    RUMAX-only hardcode -- a second, wholly different vendor round-trips
    correctly too.
    """
    fichas = load_curated_titularidad(
        _write_yaml(
            tmp_path,
            """
records:
  - empresa_edicto: "Otra Empresa S.R.L."
    vendor_match_keys: ["OTRA EMPRESA S.R.L"]
    tipo: "S.R.L."
    cuit_empresa: null
    socios:
      - nombre: "Ana Perez"
        rol: "director"
    fuente_edicto_url: "https://example.gob.ar/edicto"
    edicion_fecha: "2024-01-01"
    edicion_label: "Boletín Oficial, edición 01/01/2024"
    instrumento_fecha: "2023-12-01"
    instrumento_label: "instrumento privado del 1/12/2023"
    source_ref: "edictos-societarios/otra-empresa"
""",
        )
    )

    assert len(fichas) == 1
    assert fichas[0].empresa_edicto == "Otra Empresa S.R.L."
    assert fichas[0].socios == [{"nombre": "Ana Perez", "rol": "director"}]
    assert fichas[0].source_ref == "edictos-societarios/otra-empresa"


@pytest.mark.parametrize("forbidden_field", sorted(FORBIDDEN_SOCIO_FIELDS))
def test_load_curated_titularidad_rejects_any_forbidden_pii_field(
    tmp_path, forbidden_field
) -> None:
    """MINIMIZATION GATE (Ley 25.326 art. 4): a socio dict carrying DNI,
    domicilio, fecha_nacimiento or estado_civil must fail the build loudly,
    never pass through silently -- this is the second, independent guard
    behind "the yaml simply never contains these fields".
    """
    yaml_source = f"""
records:
  - empresa_edicto: "Empresa Riesgosa S.R.L."
    vendor_match_keys: ["EMPRESA RIESGOSA S.R.L"]
    tipo: "S.R.L."
    cuit_empresa: null
    socios:
      - nombre: "Alguien"
        rol: "socio"
        {forbidden_field}: "dato-prohibido"
    fuente_edicto_url: "https://example.gob.ar/edicto"
    edicion_fecha: "2024-01-01"
    edicion_label: "Boletín Oficial, edición 01/01/2024"
    instrumento_fecha: "2023-12-01"
    instrumento_label: "instrumento privado del 1/12/2023"
    source_ref: "edictos-societarios/empresa-riesgosa"
"""
    path = _write_yaml(tmp_path, yaml_source)

    with pytest.raises(ValueError, match=forbidden_field):
        load_curated_titularidad(path)


def test_load_curated_titularidad_rejects_an_unknown_rol(tmp_path) -> None:
    path = _write_yaml(
        tmp_path,
        """
records:
  - empresa_edicto: "Empresa X S.A."
    vendor_match_keys: ["EMPRESA X S.A"]
    tipo: "S.A."
    cuit_empresa: null
    socios:
      - nombre: "Alguien"
        rol: "presidente"
    fuente_edicto_url: "https://example.gob.ar/edicto"
    edicion_fecha: "2024-01-01"
    edicion_label: "Boletín Oficial, edición 01/01/2024"
    instrumento_fecha: "2023-12-01"
    instrumento_label: "instrumento privado del 1/12/2023"
    source_ref: "edictos-societarios/empresa-x"
""",
    )

    with pytest.raises(ValueError, match="presidente"):
        load_curated_titularidad(path)


def test_allowed_roles_are_exactly_the_minimization_spec_set() -> None:
    assert ALLOWED_ROLES == frozenset({"socio", "socio gerente", "director"})
