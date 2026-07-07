"""Extract structured fine records from HTC (Tribunal de Cuentas) fallo PDFs.

Text-layer PDFs (2023, 2024) are parsed with ``pypdf`` and a small set of
regexes tailored to the ruling's fixed legal-document structure (task
3.8). The 2022 fallo has no extractable text layer (scanned) and is
handled separately via a curated ficha (``etl/fallos_ficha_2022.yaml``,
task 3.9) -- both paths converge on the same ``FalloFicha`` shape so
``build_fallos`` (task 3.10) can treat every ejercicio identically,
per the htc-fallos spec's Neutral, Identical Treatment requirement.

Only officials fined a monetary amount ("Multas de $ ...") are modeled
as ``Fine`` records; non-monetary "Llamado de Atención" call-outs are
out of scope for this slice.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pypdf
import yaml

from .manifest import resolve_archived_path

# Manifest ids for the two text-layer fallos (task 2.5). The 2022 fallo
# is scanned (no text layer) and is never read via the manifest here --
# it comes entirely from the curated ficha YAML (task 3.9).
TEXT_LAYER_MANIFEST_IDS: dict[str, str] = {
    "2023": "htc-fallos/coronel-rosales-2023",
    "2024": "htc-fallos/coronel-rosales-2024",
}

SPANISH_MONTHS: dict[str, int] = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}

# The only two roles that receive a monetary "Multa" across the 2023/2024
# fallos. Extend this tuple if a future ejercicio fines a different role.
KNOWN_FINE_ROLES = ("Intendente Municipal", "Contadora Municipal")

_ROLE_ALTERNATION = "|".join(re.escape(role) for role in KNOWN_FINE_ROLES)
# A person's name in this document style is 1+ Title-Case given names
# followed by an ALL-CAPS surname, e.g. "Mariano Cecilio USET".
_NAME_PATTERN = r"(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+)+[A-ZÁÉÍÓÚÑ]{2,}"

FINE_PATTERN = re.compile(
    rf"\$\s*(?P<amount>[\d.]+,\d{{2}})\s+(?:al|a la)\s+"
    rf"(?P<role>{_ROLE_ALTERNATION})\s+"
    rf"(?P<name>{_NAME_PATTERN})"
)
EXPEDIENTE_PATTERN = re.compile(r"Expediente N[°º]\s*([\d./\-]+)")
DATE_PATTERN = re.compile(r"LA PLATA,\s*(\d{1,2}) de (\w+) de (\d{4})", re.IGNORECASE)
# The intendente-term clause always ends at the first ")" immediately
# followed by a period, before the Concejo Deliberante presidents' terms.
INTENDENTE_CLAUSE_PATTERN = re.compile(r"cargo de.*?\)\s*\.", re.DOTALL)
# Fixed preamble ("cargo del/de los Intendente(s) Municipal(es) [Señor(es)]")
# that precedes the actual name(s) -- stripped so it is never swept into
# the greedy name capture below (both role words are Title-Case, same as
# a person's given names).
_INTENDENTE_PREAMBLE_PATTERN = re.compile(
    r"cargo de(?:l|\s+los)\s+Intendente(?:s)?\s+Municipal(?:es)?\s+(?:Señor(?:es)?\s+)?",
    re.IGNORECASE,
)
# A stray space sometimes appears mid-date in pdftotext extraction when a
# line wraps right before the slash (e.g. "11/12 /2023") -- tolerate it
# and strip it when building the final date string.
_DATE_GROUP = r"(\d{2}\s*/\s*\d{2}\s*/\s*\d{4})"
INTENDENTE_TERM_PATTERN = re.compile(
    rf"(?P<name>{_NAME_PATTERN})\s*"
    rf"\((?:desde el|del)\s*(?P<start>{_DATE_GROUP})\s*al\s*(?P<end>{_DATE_GROUP})\)"
)


def _normalize(text: str) -> str:
    """Collapse all whitespace runs (including line wraps) to single spaces."""
    return re.sub(r"\s+", " ", text)


def _title_case_name(name: str) -> str:
    """"Mariano Cecilio USET" -> "Mariano Cecilio Uset" (unicode-aware)."""
    return _normalize(name).title()


def _parse_amount(raw: str) -> float:
    """"300.000,00" (es-AR thousands/decimal separators) -> 300000.0."""
    return float(raw.replace(".", "").replace(",", "."))


@dataclass(frozen=True)
class Fine:
    role: str
    official: str
    fine_ars: float


@dataclass(frozen=True)
class FalloFicha:
    """One ejercicio's ruling, identical shape whether text-extracted or curated."""

    ejercicio: str
    fallo_id: str  # expediente number, e.g. "3-024.0-2023"
    fallo_date: str  # ISO "YYYY-MM-DD"
    administration: str  # intendente term(s), same value for every fine in the ejercicio
    text_extracted: bool
    scanned: bool
    fines: list[Fine]
    source_ref: str


def extract_pdf_text(path: Path) -> str:
    """Extract all text from a PDF's pages, concatenated with newlines."""
    reader = pypdf.PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def parse_expediente(text: str) -> str:
    match = EXPEDIENTE_PATTERN.search(_normalize(text))
    if not match:
        raise ValueError("no expediente number found in fallo text")
    return match.group(1)


def parse_fallo_date(text: str) -> str:
    match = DATE_PATTERN.search(_normalize(text))
    if not match:
        raise ValueError("no fallo date found in fallo text")
    day, month_name, year = match.groups()
    month = SPANISH_MONTHS[month_name.lower()]
    return f"{int(year):04d}-{month:02d}-{int(day):02d}"


def parse_administration(text: str) -> str:
    """Return the intendente term(s) governing the ejercicio, e.g.

    "Mariano Cecilio Uset (01/01/2023-11/12/2023); Rodrigo Lionel
    Aristimuño (12/12/2023-31/12/2023)".

    The same string is used for every Fine in the ejercicio -- it states
    who governed and when, not who is "responsible" for a specific fine,
    keeping the field neutral and identically derived across ejercicios.
    """
    normalized = _normalize(text)
    clause_match = INTENDENTE_CLAUSE_PATTERN.search(normalized)
    if not clause_match:
        raise ValueError("no intendente term clause found in fallo text")

    # Strip the "cargo del/de los Intendente(s) Municipal(es) [Señor(es)]"
    # preamble so it is never swept into the name capture (see comment on
    # _INTENDENTE_PREAMBLE_PATTERN).
    clause = _INTENDENTE_PREAMBLE_PATTERN.sub("", clause_match.group(0), count=1)

    terms = [
        f"{_title_case_name(m.group('name'))} "
        f"({m.group('start').replace(' ', '')}–{m.group('end').replace(' ', '')})"
        for m in INTENDENTE_TERM_PATTERN.finditer(clause)
    ]
    if not terms:
        raise ValueError("no intendente terms parsed from clause")
    return "; ".join(terms)


def parse_fines(text: str) -> list[Fine]:
    normalized = _normalize(text)
    return [
        Fine(
            role=m.group("role"),
            official=_title_case_name(m.group("name")),
            fine_ars=_parse_amount(m.group("amount")),
        )
        for m in FINE_PATTERN.finditer(normalized)
    ]


def parse_text_layer_fallo(text: str, *, ejercicio: str, source_ref: str) -> FalloFicha:
    """Build a `FalloFicha` from a text-layer fallo PDF's extracted text (task 3.8)."""
    return FalloFicha(
        ejercicio=ejercicio,
        fallo_id=parse_expediente(text),
        fallo_date=parse_fallo_date(text),
        administration=parse_administration(text),
        text_extracted=True,
        scanned=False,
        fines=parse_fines(text),
        source_ref=source_ref,
    )


def load_curated_ficha(path: Path) -> FalloFicha:
    """Build a `FalloFicha` from a curated ficha YAML (task 3.9).

    Used for the 2022 fallo, whose scanned PDF has no extractable text
    layer -- fields are read by a human reviewer directly off the scan
    rather than parsed, but converge on the same `FalloFicha` shape as
    `parse_text_layer_fallo` so `build_fallos` (task 3.10) treats every
    ejercicio identically.
    """
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    fines = [
        Fine(role=f["role"], official=f["official"], fine_ars=float(f["fine_ars"]))
        for f in raw["fines"]
    ]
    return FalloFicha(
        ejercicio=raw["ejercicio"],
        fallo_id=raw["fallo_id"],
        fallo_date=raw["fallo_date"],
        administration=raw["administration"],
        text_extracted=bool(raw["text_extracted"]),
        scanned=bool(raw["scanned"]),
        fines=fines,
        source_ref=raw["source_ref"],
    )


def _ficha_to_records(ficha: FalloFicha) -> list[dict[str, Any]]:
    """One flat `FalloRecord` per fine, per design's `FalloRecord` interface.

    Every record for a given ejercicio shares the exact same field set,
    regardless of official/role/scanned -- the neutrality invariant
    (htc-fallos spec's Neutral, Identical Treatment requirement).
    """
    return [
        {
            "ejercicio": ficha.ejercicio,
            "falloId": ficha.fallo_id,
            "falloDate": ficha.fallo_date,
            "administration": ficha.administration,
            "official": fine.official,
            "role": fine.role,
            "fineArs": fine.fine_ars,
            "scanned": ficha.scanned,
            "textExtracted": ficha.text_extracted,
            "sourceRefs": [ficha.source_ref],
        }
        for fine in ficha.fines
    ]


def build_fallos(
    manifest_path: Path,
    curated_ficha_2022_path: Path,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the full `data/fallos.json` payload (task 3.10).

    Reads the 2023/2024 text-layer PDFs via the manifest and the 2022
    scanned fallo via its curated ficha, converging both on the same
    `FalloFicha` shape before flattening into `FalloRecord`s -- so every
    ejercicio/administration renders through an identical template.
    """
    fichas = [load_curated_ficha(curated_ficha_2022_path)]
    for ejercicio, manifest_id in TEXT_LAYER_MANIFEST_IDS.items():
        pdf_path = resolve_archived_path(manifest_path, manifest_id)
        text = extract_pdf_text(pdf_path)
        fichas.append(
            parse_text_layer_fallo(text, ejercicio=ejercicio, source_ref=manifest_id)
        )
    fichas.sort(key=lambda f: f.ejercicio)

    records = [record for ficha in fichas for record in _ficha_to_records(ficha)]
    generated_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "generatedAt": generated_at,
        "sourceRefs": sorted({ficha.source_ref for ficha in fichas}),
        "records": records,
    }
