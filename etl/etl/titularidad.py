"""Build the per-vendor "titularidad registral" (company ownership) display
JSON -- the HIGHEST LEGAL-RISK data this portal publishes. Read this
docstring FULLY before touching this module or ``etl/titularidad.yaml``.

WHAT THIS IS: for a proveedor in the SIBOM adjudicaciones padrón
(``etl.sibom_adjudicaciones``), this module exposes who its socios/director
were according to a primary official edicto de constitución published in a
Boletín Oficial -- never a guess, never an aggregator. Coverage is
DELIBERATELY partial: only vendors with a human-verified, primary-source
record in ``etl/titularidad.yaml`` get one; every other vendor renders
"Titularidad no disponible públicamente" at the web layer (the honest,
expected default -- see ``apps/web/lib/titularidad.ts``).

NON-NEGOTIABLE GUARDRAILS baked into this module:

1. MINIMIZATION (Ley 25.326 art. 4, principio de finalidad): only
   ``nombre`` + ``rol`` are ever modeled per socio. The curated YAML
   physically never contains DNI/CUIT-persona/domicilio/fecha de
   nacimiento/estado civil (minimization BY CONSTRUCTION -- see the
   comment block atop ``etl/titularidad.yaml``); this module adds a
   SECOND, independent guard (``_assert_no_forbidden_socio_fields``) that
   raises loudly if any of those keys ever appears in a socio dict, so an
   accidental future edit to the curated file cannot silently leak PII
   through this pipeline.
2. ROLE ALLOWLIST: every socio's ``rol`` must be one of
   ``socio`` / ``socio gerente`` / ``director`` (the roles this portal
   ever publishes) -- an unrecognized role fails the build rather than
   being published verbatim from an un-reviewed curated entry.
3. DATE-CUT: every record carries its own ``edicion_fecha``/
   ``edicion_label`` (the Boletín Oficial edition date) and
   ``instrumento_fecha``/``instrumento_label`` (the instrumento
   constitutivo date) -- the web layer renders these as "socios según el
   edicto de constitución del [fecha]", NEVER "dueño actual"/"titular
   hoy" (ownership may have changed since via cesión de cuotas).
4. PROVENANCE: every record carries a ``source_ref`` resolving to an
   ``archive-manifest.json`` record (sha256 + archived copy), same
   dual-link discipline as every other figure on this portal.

Every record here is READ DIRECTLY off the primary official edicto by a
human reviewer, NOT machine-extracted -- same curated-ficha discipline as
``fallos.py::load_curated_ficha`` (2022 scanned fallo) and
``transparencia.py::load_curated_transparencia`` (ASAP score). A
full-document parser over the archived Boletín PDF is deliberately NOT
built: that PDF also carries hundreds of unrelated people's DNI, domicilio
and estado civil across every OTHER entity's edicto published the same
day -- automating extraction over it would risk leaking exactly the PII
this module exists to keep out.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

# The only roles this portal ever publishes for a socio/director (per the
# feature's minimization spec: "nombre + rol (socio/socio gerente/director)
# + empresa + fuente"). An unrecognized role fails the build loudly rather
# than being published un-reviewed.
ALLOWED_ROLES: frozenset[str] = frozenset({"socio", "socio gerente", "director"})

# PII fields that must NEVER cross from a curated edicto reading into this
# pipeline, even though the source edicto itself states them (Ley 25.326
# art. 4, principio de finalidad). The curated YAML is expected to never
# contain these keys at all (minimization by construction) -- this set is
# the SECOND, independent guard that fails the build if one ever appears.
FORBIDDEN_SOCIO_FIELDS: frozenset[str] = frozenset(
    {
        "dni",
        "cuit",
        "domicilio",
        "fecha_nacimiento",
        "nacimiento",
        "estado_civil",
    }
)


@dataclass(frozen=True)
class TitularidadFicha:
    """One vendor's curated titularidad record, identical shape for every
    entry regardless of corporate form (S.R.L./S.A.) -- see module
    docstring for the guardrails this shape enforces.
    """

    empresa_edicto: str
    vendor_match_keys: list[str]
    tipo: str
    cuit_empresa: str | None
    socios: list[dict[str, str]]  # each dict has ONLY "nombre" and "rol"
    fuente_edicto_url: str
    edicion_fecha: str
    edicion_label: str
    instrumento_fecha: str
    instrumento_label: str
    source_ref: str


def _assert_no_forbidden_socio_fields(raw_socio: dict[str, Any]) -> None:
    present = FORBIDDEN_SOCIO_FIELDS.intersection(raw_socio.keys())
    if present:
        raise ValueError(
            "titularidad minimization violation: socio dict carries forbidden "
            f"PII field(s) {sorted(present)} -- only 'nombre' and 'rol' may ever "
            "be published (Ley 25.326 art. 4, principio de finalidad)"
        )


def _assert_allowed_rol(rol: str) -> None:
    if rol not in ALLOWED_ROLES:
        raise ValueError(
            f"titularidad role-allowlist violation: {rol!r} is not one of "
            f"{sorted(ALLOWED_ROLES)} -- only these roles are ever published"
        )


def _load_socio(raw_socio: dict[str, Any]) -> dict[str, str]:
    _assert_no_forbidden_socio_fields(raw_socio)
    rol = raw_socio["rol"]
    _assert_allowed_rol(rol)
    return {"nombre": raw_socio["nombre"], "rol": rol}


def _load_ficha(raw: dict[str, Any]) -> TitularidadFicha:
    socios = [_load_socio(s) for s in raw["socios"]]
    return TitularidadFicha(
        empresa_edicto=raw["empresa_edicto"],
        vendor_match_keys=list(raw["vendor_match_keys"]),
        tipo=raw["tipo"],
        cuit_empresa=raw.get("cuit_empresa"),
        socios=socios,
        fuente_edicto_url=raw["fuente_edicto_url"],
        edicion_fecha=raw["edicion_fecha"],
        edicion_label=raw["edicion_label"],
        instrumento_fecha=raw["instrumento_fecha"],
        instrumento_label=raw["instrumento_label"],
        source_ref=raw["source_ref"],
    )


def load_curated_titularidad(path: Path) -> list[TitularidadFicha]:
    """Load every curated titularidad record (see module docstring).

    Raises ``ValueError`` (never silently drops/redacts) if any socio
    entry carries a forbidden PII field or an unrecognized role -- a
    tampered or miscurated source fails the build loudly, same discipline
    as ``transparencia.py``'s ``assert_honest``.
    """
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return [_load_ficha(r) for r in raw["records"]]


def _ficha_to_record(ficha: TitularidadFicha) -> dict[str, Any]:
    return {
        "empresa": ficha.empresa_edicto,
        "vendorMatchKeys": ficha.vendor_match_keys,
        "tipo": ficha.tipo,
        "cuitEmpresa": ficha.cuit_empresa,
        "socios": [dict(s) for s in ficha.socios],
        "fuenteEdictoUrl": ficha.fuente_edicto_url,
        "edicionFecha": ficha.edicion_fecha,
        "edicionLabel": ficha.edicion_label,
        "instrumentoFecha": ficha.instrumento_fecha,
        "instrumentoLabel": ficha.instrumento_label,
        "sourceRef": ficha.source_ref,
    }


def build_titularidad(curated_path: Path, *, now: datetime | None = None) -> dict[str, Any]:
    """Build the full ``data/titularidad.json`` payload.

    Coverage is deliberately partial: only vendors present in
    ``curated_path`` are included here. Every other vendor's "no
    disponible" default is rendered entirely at the web layer
    (``apps/web/lib/titularidad.ts``), never fabricated here.
    """
    fichas = load_curated_titularidad(curated_path)
    records = [_ficha_to_record(f) for f in fichas]
    generated_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "generatedAt": generated_at,
        "sourceRefs": sorted({f.source_ref for f in fichas}),
        "records": records,
    }
