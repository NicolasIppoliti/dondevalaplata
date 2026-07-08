"""Parse the RAFAM "Estado de Ejecución del Presupuesto de Gastos" PDF text
layer into a searchable Jurisdicción -> Apertura Programática -> Objeto del
Gasto tree (feature G2, "gasto por partida" explorer).

This is the MAXIMUM public granularity of the municipal budget: it breaks
spending down to Jurisdicción x Apertura Programática x Fuente de
Financiamiento x Objeto del Gasto (Partida/Subparcial). There are NO
vendors/CUIT in it (that is a different, SIBOM-sourced dataset).

Scope decision (documented per the task's explicit "decide and document"
size-management allowance): the tree emitted here is pruned to THREE levels
-- Jurisdicción -> Apertura Programática (the top-level program only) ->
Objeto del Gasto leaf (the most granular partida code, e.g. "1.1.1.0") --
dropping Fuente de Financiamiento and any bare sub-program continuation line
(e.g. "01.01.00 - Secretaria Privada") as their OWN tree levels. Leaves
sharing the same (Jurisdicción, Apertura, Objeto código) triple across
different Fuentes/sub-programs are SUMMED into one node. This keeps the
payload a manageable size for a client-rendered, cheap-Android-friendly
explorer while preserving the true leaf-level granularity that makes this
dataset valuable (the code/name/amount at the deepest reported level is
never dropped or aggregated away -- only the mid-tree branching is).

Correctness (non-negotiable, per the task): every leaf row and the document's
own "TOTALES GENERALES" grand total are independently self-validated via the
same two arithmetic identities the RAFAM report itself implies for every
row: Vigente = Aprobado + Modificaciones, and "Devengado no pagado" =
Devengado - Pagado. A row/total that fails either identity is marked
``verified: False`` rather than silently trusted. `build_gasto_partida`
additionally reconciles the SUM of every leaf's Vigente/Devengado/Pagado
against the document's own TOTALES GENERALES row and RAISES (refuses to
write output) if they do not match within a tiny cents-level tolerance --
"better to parse fewer levels correctly than more levels wrong."

pdftotext extraction quirks handled here (verified by hand against the real
274-page PDF, `archive/mcr-docs/estado-de-ejecucion-presupuestaria-de-gastos-1o-trimestre.pdf`):

1. Wrapped labels glue directly onto the NEXT row's code with no whitespace,
   e.g. "...combustibles y\\nlubricantes2.5.2.0 - ..." -- handled by
   collapsing all whitespace globally before regex matching (`_normalize`,
   same technique as `etl/fallos.py`), and by anchoring each leaf match at
   its own numeric code rather than relying on a preceding boundary.
2. Hierarchy headers (Jurisdicción:/Apertura Programática:) are NOT repeated
   on a continuation page -- the whole document's extracted text is treated
   as ONE continuous stream (pages joined with "\\n", never processed one
   page at a time) so state naturally persists across a page break.
3. The final "TOTALES GENERALES" row's 8 amount columns are NOT in the same
   left-to-right order as every other row in the document -- the "TOTALES
   GENERALES" label text lands in the MIDDLE of the amount run instead of
   after it, a real rendering quirk on this one row. `parse_totales_generales`
   decodes it via the SAME two arithmetic identities, self-validating rather
   than trusting a hardcoded position blindly.
4. Some "Jurisdicción:"/"Apertura Programática:" header lines use a
   different embedded font subset (likely a bold variant) than the body
   table, whose ToUnicode CMap is broken for exactly THREE accented-vowel
   glyphs: "á" extracts as "į" (U+012F), "í" as "ķ" (U+0137), and "ú" as
   "ś" (U+015B) -- e.g. "Secretarķa ... Programįtica" for "Secretaría ...
   Programática". Verified by scanning the FULL 274-page extracted text for
   every character outside the standard Spanish alphabet: only these three
   ever appear (13, 10 and 1 occurrences respectively), always substituting
   for a real accented vowel in a real Spanish word -- never a legitimate
   character in this document, so `fix_known_font_defects` applies this as
   a targeted, safe substitution. Left unfixed, "Apertura Programįtica:"
   silently fails to match `_APERTURA_PATTERN`'s literal "Program[aá]tica:",
   which lets the PRECEDING Jurisdicción's name capture run unbounded --
   swallowing the entire following sub-tree as "name" text and misattributing
   every leaf underneath to the wrong (previous) Apertura Programática. The
   HONESTY reconciliation gate does NOT catch this class of bug (leaf sums
   stay correct regardless of which tree node they are misattributed to),
   which is why `fix_known_font_defects` runs unconditionally, first, on
   every page's raw extracted text before any hierarchy parsing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .fallos import extract_pdf_text
from .manifest import resolve_archived_path

GASTO_PARTIDA_MANIFEST_ID = "mcr-docs/estado-de-ejecucion-presupuestaria-de-gastos-1o-trimestre"

# A tiny cents-level tolerance -- amounts are parsed from exact decimal
# strings and summed as integer centavos (see `_to_centavos`), so drift
# beyond a few cents across thousands of rows would indicate a real parsing
# gap, not float rounding.
RECONCILE_TOLERANCE_ARS = 0.05

AMOUNT_PATTERN = r"-?[\d.]+,\d{2}"

_QUARTER_LABELS = {(1, 3): "1er", (4, 6): "2do", (7, 9): "3er", (10, 12): "4to"}

_HEADER_NOISE_PATTERN = re.compile(
    r"Municipalidad de\s*Coronel Rosales\s*ESTADO DE EJECUCION DEL PRESUPUESTO DE GASTOS.*?"
    r"Cr[ée]dito Vig\.-\s*Devengado",
    re.DOTALL,
)
_FOOTER_NOISE_PATTERN = re.compile(r"Filtro aplicado:.*?Partida Subparcial", re.DOTALL)

_PERIOD_PATTERN = re.compile(
    r"Del\s*(\d{2})/(\d{2})/(\d{4})\s*al\s*(\d{2})/(\d{2})/(\d{4})"
)
_EJERCICIO_PATTERN = re.compile(
    r"Ejercicio:\s*Hoja: \d+ de \d+R\.A\.F\.A\.M\.\s*\d{2}/\d{2}/(\d{4})"
)

_JURISDICCION_PATTERN = re.compile(
    r"Jurisdicci[oó]n:\s*(?P<code>\S+)\s*-\s*(?P<name>.+?)\s*"
    r"(?=Apertura Program[aá]tica:|Jurisdicci[oó]n:|$)"
)
_APERTURA_PATTERN = re.compile(
    r"Apertura Program[aá]tica:\s*(?P<code>[\d.]+)\s*-\s*(?P<name>.+?)\s*"
    r"(?=\d{2}\.\d{2}\.\d{2}\s*-|(?<!\d)\d\.\d\.\d\.\d\s*-"
    # A bare Fuente de Financiamiento line (e.g. "110 - Tesoro Municipal")
    # can immediately follow the Apertura header with NO intervening
    # sub-program continuation line -- a real case found in the actual PDF
    # (jurisdicción 1110116000). Fuente names always start with a capital
    # letter, which a 3-digit amount/code fragment never does, so this stop
    # point is safe.
    r"|(?<!\d)\d{3}\s*-\s*[A-ZÁÉÍÓÚÑ]"
    r"|Jurisdicci[oó]n:|Apertura Program[aá]tica:|$)"
)
_OBJETO_PATTERN = re.compile(
    rf"(?<!\d)(?P<code>\d\.\d\.\d\.\d)\s*-\s*"
    # The name must NOT contain another objeto code: a bare group-header row
    # (e.g. "1.0.0.0 - Gastos en personal", which has no amounts of its own)
    # would otherwise greedily swallow every following header/leaf code as
    # "name" text up to the first amounts it finds, several rows too deep.
    # Blocking that lets a header-only match fail outright so `finditer`
    # retries from the NEXT code -- the real leaf.
    rf"(?P<name>(?:(?!(?<!\d)\d\.\d\.\d\.\d\s*-).)+?)\s*"
    rf"(?P<amounts>(?:{AMOUNT_PATTERN}\s*){{8}})"
)
_TOTALES_GENERALES_PATTERN = re.compile(
    rf"(?P<blob>(?:{AMOUNT_PATTERN}\s*){{6}})TOTALES GENERALES\s*"
    rf"(?P<tail>(?:{AMOUNT_PATTERN}\s*){{2}})"
)


# See module docstring point 4: a real, verified broken-CMap defect in some
# header lines of the actual PDF, discovered by scanning the FULL extracted
# text for every character outside the standard Spanish alphabet -- only
# these three ever appear, always substituting for the accented vowel shown.
_KNOWN_FONT_DEFECTS = {
    "į": "á",
    "ķ": "í",
    "ś": "ú",
}


def fix_known_font_defects(text: str) -> str:
    """Repair the three known broken-glyph substitutions (module docstring
    point 4). Safe: none of these three characters are legitimate Spanish
    letters, so this can never "fix" a genuinely correct character."""
    for broken, correct in _KNOWN_FONT_DEFECTS.items():
        text = text.replace(broken, correct)
    return text


def _normalize(text: str) -> str:
    """Collapse all whitespace runs (including line wraps) to single spaces."""
    return re.sub(r"\s+", " ", text).strip()


def parse_amount(raw: str) -> float:
    """"197.145.444,00" (es-AR thousands/decimal separators) -> 197145444.0."""
    return float(raw.strip().replace(".", "").replace(",", "."))


def _to_centavos(value: float) -> int:
    """Convert an ARS float to integer centavos for drift-free summation."""
    return round(value * 100)


def strip_page_noise(text: str) -> str:
    """Remove the repeating per-page header/footer boilerplate.

    Safe to call on the WHOLE joined-pages document text at once (the
    patterns match/repeat once per page occurrence).
    """
    text = _HEADER_NOISE_PATTERN.sub(" ", text)
    text = _FOOTER_NOISE_PATTERN.sub(" ", text)
    return text


@dataclass(frozen=True)
class ObjetoAmounts:
    aprobado: float
    modificaciones: float
    vigente: float
    preventivo: float
    compromiso: float
    devengado: float
    pagado: float
    devengado_no_pagado: float


def amounts_are_consistent(amounts: ObjetoAmounts, *, tolerance: float = 0.01) -> bool:
    """Self-validate a row/total against the report's own arithmetic:

    Vigente = Aprobado + Modificaciones, and
    Devengado no pagado = Devengado - Pagado.
    """
    vigente_ok = abs((amounts.aprobado + amounts.modificaciones) - amounts.vigente) <= tolerance
    dev_no_pag_ok = (
        abs((amounts.devengado - amounts.pagado) - amounts.devengado_no_pagado) <= tolerance
    )
    return vigente_ok and dev_no_pag_ok


def _parse_amounts_blob(blob: str) -> ObjetoAmounts:
    """Regular row/subtotal column order: Aprobado, Mod, Vigente, Preventivo,
    Compromiso, Devengado, Pagado, Devengado-no-pagado."""
    values = [parse_amount(m) for m in re.findall(AMOUNT_PATTERN, blob)]
    if len(values) != 8:
        raise ValueError(f"expected 8 amounts in row, found {len(values)}: {blob!r}")
    return ObjetoAmounts(*values)


@dataclass(frozen=True)
class ObjetoLeaf:
    code: str
    name: str
    vigente: float
    devengado: float
    pagado: float
    verified: bool


def parse_objeto_leaves(normalized_text: str) -> list[tuple[int, ObjetoLeaf]]:
    """Return `(match_start_position, ObjetoLeaf)` for every leaf partida row,
    in document order. `normalized_text` must already be noise-stripped and
    whitespace-normalized (see `strip_page_noise` / `_normalize`).

    "Total X" subtotal rows and bare group-header rows (e.g. "1.1.6.0 -
    Contribuciones patronales", which has no trailing amounts) never match:
    the pattern requires a leading N.N.N.N code AND exactly 8 trailing
    amounts on the same match.
    """
    leaves = []
    for match in _OBJETO_PATTERN.finditer(normalized_text):
        amounts = _parse_amounts_blob(match.group("amounts"))
        leaves.append(
            (
                match.start(),
                ObjetoLeaf(
                    code=match.group("code"),
                    name=_normalize(match.group("name")),
                    vigente=amounts.vigente,
                    devengado=amounts.devengado,
                    pagado=amounts.pagado,
                    verified=amounts_are_consistent(amounts),
                ),
            )
        )
    return leaves


@dataclass(frozen=True)
class _Anchor:
    position: int
    code: str
    name: str


def _parse_anchors(pattern: re.Pattern[str], text: str) -> list[_Anchor]:
    return [
        _Anchor(m.start(), m.group("code"), _normalize(m.group("name")))
        for m in pattern.finditer(text)
    ]


def _last_anchor_before(anchors: list[_Anchor], position: int) -> _Anchor | None:
    result = None
    for anchor in anchors:
        if anchor.position > position:
            break
        result = anchor
    return result


def build_gasto_partida_tree(normalized_text: str) -> list[dict[str, Any]]:
    """Build the pruned Jurisdicción -> Programa -> Objeto tree (see module
    docstring for the scope decision). `normalized_text` must already be
    noise-stripped (see `strip_page_noise`) -- this function normalizes
    whitespace itself.
    """
    text = _normalize(normalized_text)
    jurisdicciones = _parse_anchors(_JURISDICCION_PATTERN, text)
    aperturas = _parse_anchors(_APERTURA_PATTERN, text)
    leaves = parse_objeto_leaves(text)

    tree: dict[str, dict[str, Any]] = {}
    order: list[str] = []

    for position, leaf in leaves:
        jurisdiccion = _last_anchor_before(jurisdicciones, position)
        apertura = _last_anchor_before(aperturas, position)
        if jurisdiccion is None or apertura is None:
            raise ValueError(
                f"objeto leaf {leaf.code!r} ({leaf.name!r}) at position {position} has no "
                "preceding Jurisdicción/Apertura Programática header -- refusing to "
                "fabricate its place in the hierarchy"
            )

        if jurisdiccion.code not in tree:
            tree[jurisdiccion.code] = {
                "code": jurisdiccion.code,
                "name": jurisdiccion.name,
                "_programas": {},
                "_programa_order": [],
            }
            order.append(jurisdiccion.code)
        jnode = tree[jurisdiccion.code]

        if apertura.code not in jnode["_programas"]:
            jnode["_programas"][apertura.code] = {
                "code": apertura.code,
                "name": apertura.name,
                "_objetos": {},
                "_objeto_order": [],
            }
            jnode["_programa_order"].append(apertura.code)
        pnode = jnode["_programas"][apertura.code]

        if leaf.code not in pnode["_objetos"]:
            pnode["_objetos"][leaf.code] = {
                "code": leaf.code,
                "name": leaf.name,
                "_vigenteCentavos": 0,
                "_devengadoCentavos": 0,
                "_pagadoCentavos": 0,
                "verified": True,
            }
            pnode["_objeto_order"].append(leaf.code)
        onode = pnode["_objetos"][leaf.code]
        onode["_vigenteCentavos"] += _to_centavos(leaf.vigente)
        onode["_devengadoCentavos"] += _to_centavos(leaf.devengado)
        onode["_pagadoCentavos"] += _to_centavos(leaf.pagado)
        onode["verified"] = onode["verified"] and leaf.verified

    return [_finalize_jurisdiccion(tree[code]) for code in order]


def _finalize_jurisdiccion(jnode: dict[str, Any]) -> dict[str, Any]:
    programas = [
        _finalize_programa(jnode["_programas"][code]) for code in jnode["_programa_order"]
    ]
    return {"code": jnode["code"], "name": jnode["name"], "programas": programas}


def _finalize_programa(pnode: dict[str, Any]) -> dict[str, Any]:
    objetos = [_finalize_objeto(pnode["_objetos"][code]) for code in pnode["_objeto_order"]]
    return {"code": pnode["code"], "name": pnode["name"], "objetos": objetos}


def _finalize_objeto(onode: dict[str, Any]) -> dict[str, Any]:
    return {
        "code": onode["code"],
        "name": onode["name"],
        "vigenteArs": onode["_vigenteCentavos"] / 100,
        "devengadoArs": onode["_devengadoCentavos"] / 100,
        "pagadoArs": onode["_pagadoCentavos"] / 100,
        "verified": onode["verified"],
    }


def parse_period(text: str) -> dict[str, str]:
    """Extract the exercise year and quarter date range, e.g. "Del 01/01/2026
    al 31/03/2026" + "Ejercicio: ... 2026" -> a human "1er trimestre 2026"
    label alongside the ISO date range.
    """
    period_match = _PERIOD_PATTERN.search(text)
    if not period_match:
        raise ValueError("no period ('Del DD/MM/AAAA al DD/MM/AAAA') found in gasto-partida text")
    from_day, from_month, from_year, to_day, to_month, to_year = period_match.groups()

    ejercicio_match = _EJERCICIO_PATTERN.search(text)
    ejercicio = ejercicio_match.group(1) if ejercicio_match else from_year

    quarter = _QUARTER_LABELS.get((int(from_month), int(to_month)))
    label = (
        f"{quarter} trimestre {ejercicio}"
        if quarter
        else f"{from_year}-{from_month} a {to_year}-{to_month}"
    )

    return {
        "ejercicio": ejercicio,
        "from": f"{from_year}-{from_month}-{from_day}",
        "to": f"{to_year}-{to_month}-{to_day}",
        "label": label,
    }


def parse_totales_generales(text: str) -> ObjetoAmounts:
    """Decode the document's single "TOTALES GENERALES" row.

    See module docstring point 3: this row's amount-column order differs
    from every other row (the label lands mid-sequence). The two positional
    groups this regex captures --six amounts, then the label, then two more
    amounts-- decode to [Vigente, Preventivo, Compromiso, Devengado, Pagado,
    DevengadoNoPagado] then [Aprobado, Modificaciones], which is verified
    below via the SAME arithmetic identities every regular row satisfies
    (never trusted blindly).
    """
    normalized = _normalize(text)
    match = _TOTALES_GENERALES_PATTERN.search(normalized)
    if not match:
        raise ValueError("TOTALES GENERALES row not found in gasto-partida text")

    vigente, preventivo, compromiso, devengado, pagado, devengado_no_pagado = [
        parse_amount(v) for v in re.findall(AMOUNT_PATTERN, match.group("blob"))
    ]
    aprobado, modificaciones = [
        parse_amount(v) for v in re.findall(AMOUNT_PATTERN, match.group("tail"))
    ]
    totals = ObjetoAmounts(
        aprobado=aprobado,
        modificaciones=modificaciones,
        vigente=vigente,
        preventivo=preventivo,
        compromiso=compromiso,
        devengado=devengado,
        pagado=pagado,
        devengado_no_pagado=devengado_no_pagado,
    )
    if not amounts_are_consistent(totals, tolerance=0.02):
        raise ValueError(
            "TOTALES GENERALES arithmetic identities failed to validate -- refusing to "
            f"trust the extracted grand total: {totals!r}"
        )
    return totals


def _sum_leaf_centavos(jurisdicciones: list[dict[str, Any]]) -> dict[str, int]:
    vigente = devengado = pagado = 0
    leaf_count = 0
    unverified_count = 0
    for jurisdiccion in jurisdicciones:
        for programa in jurisdiccion["programas"]:
            for objeto in programa["objetos"]:
                vigente += _to_centavos(objeto["vigenteArs"])
                devengado += _to_centavos(objeto["devengadoArs"])
                pagado += _to_centavos(objeto["pagadoArs"])
                leaf_count += 1
                if not objeto["verified"]:
                    unverified_count += 1
    return {
        "vigente": vigente,
        "devengado": devengado,
        "pagado": pagado,
        "leafCount": leaf_count,
        "unverifiedLeafCount": unverified_count,
    }


def _reconcile(
    jurisdicciones: list[dict[str, Any]], grand_total: ObjetoAmounts
) -> dict[str, Any]:
    sums = _sum_leaf_centavos(jurisdicciones)
    diff_vigente = (sums["vigente"] - _to_centavos(grand_total.vigente)) / 100
    diff_devengado = (sums["devengado"] - _to_centavos(grand_total.devengado)) / 100
    diff_pagado = (sums["pagado"] - _to_centavos(grand_total.pagado)) / 100
    reconciles = (
        abs(diff_vigente) <= RECONCILE_TOLERANCE_ARS
        and abs(diff_devengado) <= RECONCILE_TOLERANCE_ARS
        and abs(diff_pagado) <= RECONCILE_TOLERANCE_ARS
    )
    return {
        "reconciles": reconciles,
        "toleranceArs": RECONCILE_TOLERANCE_ARS,
        "totalVigenteArs": grand_total.vigente,
        "totalDevengadoArs": grand_total.devengado,
        "totalPagadoArs": grand_total.pagado,
        "sumLeafVigenteArs": sums["vigente"] / 100,
        "sumLeafDevengadoArs": sums["devengado"] / 100,
        "sumLeafPagadoArs": sums["pagado"] / 100,
        "diffVigenteArs": diff_vigente,
        "diffDevengadoArs": diff_devengado,
        "diffPagadoArs": diff_pagado,
        "leafCount": sums["leafCount"],
        "unverifiedLeafCount": sums["unverifiedLeafCount"],
    }


def build_gasto_partida(manifest_path: Path, *, now: datetime | None = None) -> dict[str, Any]:
    """Build the full `data/gasto-partida.json` payload.

    HONESTY GATE: raises `ValueError` (refusing to write any output) if the
    sum of every parsed leaf's Vigente/Devengado/Pagado does not reconcile,
    within `RECONCILE_TOLERANCE_ARS`, against the PDF's own "TOTALES
    GENERALES" row -- "better to parse fewer levels correctly than more
    levels wrong" (task requirement). This is the single acceptance gate
    protecting every figure this feature displays.
    """
    pdf_path = resolve_archived_path(manifest_path, GASTO_PARTIDA_MANIFEST_ID)
    raw_text = fix_known_font_defects(extract_pdf_text(pdf_path))

    period = parse_period(raw_text)
    grand_total = parse_totales_generales(raw_text)
    jurisdicciones = build_gasto_partida_tree(strip_page_noise(raw_text))
    reconciliation = _reconcile(jurisdicciones, grand_total)

    if not reconciliation["reconciles"]:
        raise ValueError(
            "gasto-partida reconciliation failed -- refusing to write data/gasto-partida.json: "
            f"diffVigenteArs={reconciliation['diffVigenteArs']}, "
            f"diffDevengadoArs={reconciliation['diffDevengadoArs']}, "
            f"diffPagadoArs={reconciliation['diffPagadoArs']} "
            f"(tolerance {RECONCILE_TOLERANCE_ARS} ARS)"
        )

    generated_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "generatedAt": generated_at,
        "period": period,
        "reconciliation": reconciliation,
        "sourceRefs": [GASTO_PARTIDA_MANIFEST_ID],
        "jurisdicciones": jurisdicciones,
    }
