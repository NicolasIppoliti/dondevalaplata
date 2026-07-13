"""Parse the archived "Stock de Deuda y Perfil de Vencimientos" PDFs (RAFAM
Planilla C) into a quarterly headline-total series (feature H2a,
`data/deuda-historica.json`).

The municipality published 1er/2do/3er trimestre 2025 (cierre 30/09/2025),
then went quiet for a while -- see `etl/cadencia.yaml`'s `deuda` block
history. On 2026-07-13 it backfilled 4to trimestre 2025, 1er trimestre 2026
and 2do trimestre 2026 in a single batch (verified live; WordPress slugs for
1er/2do trimestre collide with the same-named 2025 documents and are
disambiguated with a `-2` suffix by the CMS, e.g.
`stock-de-deuda-y-perfil-de-vencimientos-2o-trimestre-2`). This module only
PARSES the archived PDFs into a series; the "how stale is the latest one"
framing itself (days/quarters elapsed) is already computed live by
`cadencia.py` from the same source document and reused as-is by the web
layer, never duplicated here.

Text-extraction notes (verified by hand against the three real archived
PDFs, `archive/mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-{1o,2o,3o}-trimestre.pdf`):

1. Unlike every other PDF this ETL parses (RAFAM gastos, fallos), THIS
   report's amount columns use EN-US formatting (comma thousands, dot
   decimal -- "194,447,135.09"), not the es-AR convention
   (`etl.gasto_partida.parse_amount` would silently misparse it) --
   `parse_amount_en_us` is a distinct, dedicated parser for this reason.
2. The headline total ("1.  DEUDA PÚBLICA <amount>") and the closing date
   ("SALDO AL" column header, printed as "ORGANISMO ACREEDOR <DD/MM/YYYY>
   AMORTIZ. ...") are each single, unambiguous, exactly-once-per-document
   matches -- reliable to parse directly off the raw text layer.
3. Composition breakdown (a per-ORGANISMO ACREEDOR "who is the money owed
   to" split) was explicitly attempted and DELIBERATELY DROPPED: the 1er
   trimestre PDF is the only one whose text layer extracts far enough to
   see every one of the document's own sub-totals, and even there, the
   printed "1.1. DEUDA PÚBLICA CONSOLIDADA" sub-total ($34,414,481.24)
   does NOT reconcile against the sum of its own visible child rows once
   "BANCO PROVINCIA" ($18,334,333.42, nested under "ENTIDADES BANCARIAS Y
   FINANCIERAS", itself nested under 1.1) is included:
   34,414,481.24 (1.1 as printed) + 0.00 (1.2 DEUDA CONTINGENTE, blank) +
   141,698,320.43 (1.3 DEUDA FLOTANTE) + 18,334,333.42 (BANCO PROVINCIA)
   = 194,447,135.09, which matches the headline total EXACTLY -- meaning
   Banco Provincia's debt is real and counted in the total, but sits
   OUTSIDE the document's own printed "1.1" sub-total for a reason this
   ETL cannot resolve from the text layer alone (a genuine ambiguity in
   the source document's own internal subtotaling, not an extraction
   bug -- confirmed via `pdftotext -layout`, which shows the same figures
   aligned under the same columns). The 2do/3er trimestre PDFs are even
   less complete: their text layer stops rendering entirely partway
   through the entity list (both files are ~9KB vs. the 1er trimestre's
   ~74KB), so most sub-total rows aren't even present to attempt a
   reconciliation against. Per the task's explicit doctrine ("if a
   breakdown line is ambiguous, omit it rather than guess"), this module
   publishes ONLY the reconciled, unambiguous headline total per quarter
   -- never a composition it cannot verify. Anyone wanting the full
   line-item detail can read the cited archived PDF directly (dual-link +
   sha256 provenance, same as every other figure on the portal).

Anomaly annotations (e.g. the 4to trimestre 2025 headline total, ~39x its
neighbors -- a real, verified-correct figure in the municipality's own
PDF, not a parsing bug) are NEVER hardcoded here: this module has zero
anomaly concept of its own. `build_deuda_historica` merges each entry from
the curated `etl/deuda_anomalies.yaml` table onto its matching period's
parsed point (see `load_curated_anomalies`), so the annotation survives a
real ETL re-run -- unlike a hand-edit to the committed
`data/deuda-historica.json`, which the next `etl build-deuda-historica`
would silently overwrite.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

from .fallos import extract_pdf_text
from .manifest import resolve_archived_path

# In document-date order (oldest first). 1er/2do/3er trimestre 2025 were
# published on the original cadence; 4to trimestre 2025, 1er trimestre 2026
# and 2do trimestre 2026 were all backfilled on 2026-07-13 -- see module
# docstring. `parse_deuda_stock_pdf` derives each entry's real `period` from
# the PDF's own "SALDO AL" date, so the ORDER of manifest ids here only
# needs to be a valid archive lookup list; `build_deuda_historica` re-sorts
# the series by parsed `fecha` regardless.
DEUDA_HISTORICA_MANIFEST_IDS = [
    "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-1o-trimestre",
    "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-2o-trimestre",
    "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre",
    "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-4o-trimestre",
    "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-1o-trimestre-2",
    "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-2o-trimestre-2",
]

_SALDO_DATE_PATTERN = re.compile(r"ORGANISMO ACREEDOR\s+(\d{2})/(\d{2})/(\d{4})")
# See module docstring point 2: this is the ONE standalone "1.  DEUDA
# PÚBLICA <amount>" row, never the "1.1.  DEUDA PÚBLICA CONSOLIDADA" (or
# any other numbered) sub-total -- see
# test_parse_deuda_stock_pdf_does_not_confuse_1_1_subtotal_with_headline
# for the regression proof this pattern alone (no lookbehind needed) never
# matches "1.1.": `\s*` between "1." and "DEUDA" cannot skip over the
# second "1" digit of "1.1.", and matching from THAT second "1." instead
# requires "DEUDA PÚBLICA" to be immediately followed by an amount, which
# "CONSOLIDADA" never is.
_HEADLINE_TOTAL_PATTERN = re.compile(r"1\.\s*DEUDA P[ÚU]BLICA\s+(-?[\d,]+\.\d{2})")

_QUARTER_NUMBER_BY_CLOSING_MONTH = {"03": 1, "06": 2, "09": 3, "12": 4}
_QUARTER_ORDINAL_BY_CLOSING_MONTH = {
    "03": "1er",
    "06": "2do",
    "09": "3er",
    "12": "4to",
}


def parse_amount_en_us(raw: str) -> float:
    """"194,447,135.09" (EN-US thousands/decimal separators, see module
    docstring point 1) -> 194447135.09. NOT the es-AR convention every
    other parser in this ETL uses -- see `etl.gasto_partida.parse_amount`
    for that one."""
    return float(raw.strip().replace(",", ""))


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def parse_deuda_stock_pdf(text: str) -> dict[str, Any]:
    """Parse one "Stock de Deuda y Perfil de Vencimientos" PDF's extracted
    text into `{period, periodLabel, fecha, totalArs}`. Raises `ValueError`
    (never guesses) if either the closing date or the headline total is not
    found, or if the closing month is not a real calendar quarter-end.
    """
    normalized = _normalize(text)

    date_match = _SALDO_DATE_PATTERN.search(normalized)
    if not date_match:
        raise ValueError(
            "no 'SALDO AL' closing date found (expected an 'ORGANISMO "
            "ACREEDOR <DD/MM/YYYY>' header) in stock-de-deuda text"
        )
    day, month, year = date_match.groups()

    total_match = _HEADLINE_TOTAL_PATTERN.search(normalized)
    if not total_match:
        raise ValueError(
            "no headline '1.  DEUDA PÚBLICA <amount>' total found in "
            "stock-de-deuda text"
        )
    total_ars = parse_amount_en_us(total_match.group(1))

    quarter_number = _QUARTER_NUMBER_BY_CLOSING_MONTH.get(month)
    quarter_ordinal = _QUARTER_ORDINAL_BY_CLOSING_MONTH.get(month)
    if quarter_number is None or quarter_ordinal is None:
        raise ValueError(
            f"unexpected stock-de-deuda closing month {month!r} "
            "(expected a calendar quarter-end: 03, 06, 09 or 12)"
        )

    return {
        "period": f"{year}-Q{quarter_number}",
        "periodLabel": f"{quarter_ordinal} trimestre {year}",
        "fecha": f"{year}-{month}-{day}",
        "totalArs": total_ars,
    }


def load_curated_anomalies(path: Path) -> dict[str, dict[str, Any]]:
    """Load the curated per-quarter anomaly table (`etl/deuda_anomalies.yaml`
    by default -- see its module comment for the durability rationale).

    Returns a `{period: {"flagged": bool, "note": str}}` mapping.
    `build_deuda_historica` merges each entry onto the matching parsed
    point's `anomaly` field; the parser itself never invents or hardcodes
    one. Raises `ValueError` if any entry's `note` is blank -- a curated
    annotation with nothing to say is always a curation mistake, never
    intentional (same discipline as `titularidad.py`'s loader guards).
    """
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    entries = raw.get("anomalies") or {}
    anomalies: dict[str, dict[str, Any]] = {}
    for period, entry in entries.items():
        note = (entry.get("note") or "").strip()
        if not note:
            raise ValueError(
                f"etl/deuda_anomalies.yaml entry for period {period!r} has a "
                "blank note -- a curated anomaly annotation with nothing to "
                "say is always a curation mistake"
            )
        anomalies[period] = {"flagged": bool(entry["flagged"]), "note": entry["note"]}
    return anomalies


def build_deuda_historica(
    manifest_path: Path,
    curated_anomalies_path: Path,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the full `data/deuda-historica.json` payload: the quarterly
    headline-total series for every archived stock-de-deuda PDF, oldest
    first. Raises `ValueError` if the series ends up with fewer entries
    than manifest ids (a parse failure) or a duplicate period (would
    silently overwrite one quarter's real figure with another's).

    `curated_anomalies_path` points at the curated per-period anomaly
    table (see `load_curated_anomalies`) -- any period found there gets an
    `anomaly` field merged onto its point. This is the ONLY way an
    `anomaly` field can appear in the output; the parser never invents
    one, which is what makes it durable across ETL re-runs.
    """
    anomalies = load_curated_anomalies(curated_anomalies_path)

    series = []
    for manifest_id in DEUDA_HISTORICA_MANIFEST_IDS:
        pdf_path = resolve_archived_path(manifest_path, manifest_id)
        text = extract_pdf_text(pdf_path)
        parsed = parse_deuda_stock_pdf(text)
        entry = {**parsed, "sourceRef": manifest_id}
        anomaly = anomalies.get(parsed["period"])
        if anomaly is not None:
            entry["anomaly"] = anomaly
        series.append(entry)

    series.sort(key=lambda entry: entry["fecha"])

    periods = [entry["period"] for entry in series]
    if len(periods) != len(set(periods)):
        raise ValueError(
            f"deuda-historica build produced duplicate periods: {periods!r} "
            "-- refusing to write a series that would silently drop a quarter"
        )

    generated_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "generatedAt": generated_at,
        "series": series,
        "sourceRefs": list(DEUDA_HISTORICA_MANIFEST_IDS),
    }
