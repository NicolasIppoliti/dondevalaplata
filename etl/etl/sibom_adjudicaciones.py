"""Parse SIBOM (Boletín Oficial Municipal, sibom.slyt.gba.gob.ar/cities/28)
decretos into adjudicación rows: named vendor + exact amount + tender number
+ expediente + date (feature G3, "adjudicaciones" monitor).

This is the ONLY public source with vendor + amount for municipal
procurement (see ``gasto_partida.py``'s module docstring: the RAFAM budget
report has amounts but never vendors). Reuses the SIBOM bulletin PDFs
already archived under the ``sibom`` capability (F0) -- see ``sibom.py`` for
bulletin-listing discovery and ``cli.py``'s ``discover_sibom_actos`` for how
the individual adjudicación acts identified here get their own HTML page
archived (sha256 + manifest row + R2) for per-row provenance.

CORRECTNESS RULE (non-negotiable, per the task): a row is published only
when vendor + amount + decreto are ALL unambiguously extracted. Every SIBOM
adjudicación decreto states its peso amount TWICE -- spelled out in words
and as a numeric figure in parentheses -- and this parser cross-validates
the two readings (see ``spanish_numbers.py``) before trusting either one:
disagreement (whether a real drafting typo or an extraction artifact) means
the row is SKIPPED, never guessed. Operative clauses that award money but
yield zero valid rows are counted so the page can honestly report
"N actos no pudieron parsearse automáticamente".

TWO OPERATIVE VERBS, BOTH PARSED. Competitive procedures are awarded with
"Adjudicar"; direct contracts are awarded with "Autorizase la Contratación
Directa con/a/de <counterparty>" and never use "Adjudicar" at all. Parsing
only the first verb hid every direct contract -- the least competitive and
therefore most accountability-relevant modality -- from the dataset. Direct
contracts usually cite no tender number (there was no tender), so their
``procedimiento`` is the bare label "Contratación Directa": which modality
was used is itself the signal, and leaving it null would make these rows
indistinguishable from an unparsed competitive procedure.

THE BIDDER FIELD IS NEVER AN EMPTY LIST. ``oferentes`` records who else bid,
which is what tells a reader how contested a tender actually was. Only ~25%
of competitive procedures publish a parseable list, and direct contracts have
no competitors by construction, so an empty array would assert "nobody else
bid" -- a claim the documents do not support. Every row therefore carries an
explicit ``estado``: ``listado`` (we have the list), ``sin-competencia`` (a
direct contract, where the law required no competitors) or ``no-publicado``
(a competitive tender whose list the Municipality did not publish).
Extraction refuses rather than guesses: a parse is discarded unless the
awarded vendor itself appears in it, and any name still containing a comma is
rejected because "Ripoll, Miguel A. y Di Bella, Salvador E. S.H" is ONE
sociedad de hecho while "Miguera Carla Anabella, Diego Pedro Botta" is TWO
bidders, and nothing in the text distinguishes them.

Text-extraction quirks handled here (verified against the real archived
bulletin PDFs, the same class of defect already documented in
``gasto_partida.py``):

1. Ligatures ("ﬁ", "ﬂ", "ﬀ", "ﬃ") are extremely common in this PDF's
   embedded font (13000+ occurrences across the corpus) -- e.g. "firma"
   extracts as "ﬁrma", silently breaking any literal-text match.
   `normalize_bulletin_text` applies Unicode NFKC normalization, which
   decomposes ligatures to their ASCII letters while still recomposing
   accented Spanish characters back to single codepoints (verified: NFKC
   never mangles "á", "í", etc.).
2. A repeating page-footer ("Municipio de Coronel Rosales\\nBoletin Oficial
   Municipal\\nPag. N") gets interleaved mid-sentence whenever a decreto
   spans a page break, breaking naive substring/regex matches that assume
   contiguous prose. Stripped unconditionally before any parsing.
3. Decree headers are NOT reliably resolvable via the bulletin's own HTML
   listing page title text (which sometimes drops leading zeros, e.g. "Nº 7"
   in the listing vs. "Decreto Nº 07/2023" in the PDF body) -- block
   splitting here is done ENTIRELY from the PDF's own text (see
   `extract_decree_blocks`), using the literal "Decreto Nº N/YYYY" header
   immediately followed by a "Coronel Rosales, DD/MM/YYYY" dateline as the
   anchor. The bulletin listing page is only ever used downstream (in
   `cli.discover_sibom_actos`) to resolve a confirmed candidate's own act
   URL for archiving -- never to decide which decree a row belongs to.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

from .manifest import load_manifest
from .spanish_numbers import parse_ars_numeric, words_to_number

_FOOTER_PATTERN = re.compile(
    r"\n?Municipio de Coronel Rosales\nBoletin Oficial Municipal\nPag\.\s*\d+\n?"
)


def normalize_bulletin_text(raw: str) -> str:
    """NFKC-normalize (fixes ligatures, preserves accents) and strip the
    repeating page-footer boilerplate that otherwise interleaves mid-sentence.
    """
    text = unicodedata.normalize("NFKC", raw)
    return _FOOTER_PATTERN.sub("\n", text)


_DECREE_ANCHOR = re.compile(
    r"Decreto N[º°o]\s*(\d+)\s*/\s*(\d{2,4})\s*\n"
    r"(?:Publicado en versi[oó]n extractada\s*\n)?"
    r"Coronel Rosales,\s*(\d{2}/\d{2}/\d{4})"
)


def extract_decree_blocks(text: str) -> list[dict]:
    """Split normalized bulletin text into individual decree blocks.

    Each block spans from its own "Decreto Nº N/YYYY ... Coronel Rosales,
    date" header to the start of the NEXT decree header found (or the end of
    the text). Decrees published only as a short "extracted version"
    (SIBOM's own disclaimer for acts without full legal text) are excluded
    here whenever that disclaimer prevents the dateline pattern from
    matching -- they carry no verifiable adjudicación content anyway.
    """
    blocks = []
    matches = list(_DECREE_ANCHOR.finditer(text))
    for i, m in enumerate(matches):
        year = m.group(2)
        year = year if len(year) == 4 else f"20{year}"
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        blocks.append(
            {
                "number": int(m.group(1)),
                "year": year,
                "fecha": m.group(3),
                "text": text[m.start() : end],
            }
        )
    return blocks


# The decretos spell the clause heading both ways. 1.295 headings in the
# archived corpus use the accented "ARTÍCULO" and were never split, so their
# operative clauses stayed fused to the preceding one -- which both hides
# awards and lets one clause's amount leak into another's cross-validation.
_ARTICULO_SPLIT = re.compile(r"ART[ÍI]CULO\s*\d+[º°o]?\s*:?")

# Two different operative verbs award municipal money, and BOTH must be
# parsed. Competitive procedures (licitación pública/privada, concurso de
# precios) are awarded with "Adjudicar". Direct contracts -- the LOM Arts.
# 132 inc. D / 156 inc. 1 exceptions to competitive bidding -- are awarded
# with "Autorizase la Contratación Directa con/a/de <counterparty>" and never
# use the word "Adjudicar" at all. Matching only the latter verb silently
# hid every direct contract in the corpus, i.e. the LEAST competitive and
# therefore most accountability-relevant modality.
_DIRECT_CONTRACT_VERB = r"Autor[ií]zase\s+la\s+[Cc]ontrataci[oó]n\s+[Dd]irecta"
# Competitive awards are not always written in the infinitive. The decretos
# also use the enclitic third-person forms ("Adjudicase el Concurso de Precios
# Nº 02/25 al proveedor...") and the subjunctive ("Adjudíquese"), which carry
# the accent on the stem. Matching only "Adjudicar" hid ARS 84 million of real
# awards, including every one of decreto 20/2026's three adjudicatarios.
_ADJUDICAR_VERB = r"(?:Adjudic(?:ar|ase|anse)|Adjud[ií]quese)"
_OPERATIVE_CLAUSE = re.compile(_ADJUDICAR_VERB + r"|" + _DIRECT_CONTRACT_VERB)

# Ordered by specificity: quoted-name forms first (cheapest to trust), then
# the connector-keyword forms, then a last-resort bare-name fallback.
_VENDOR_STOP = (
    r'(?=["”]|,?\s*\(Proveedor|,?\s+(?:la|el)\s+Licitaci[oó]n|,?\s+(?:el|los)\s+Concurso'
    r"|,?\s+(?:la|el)\s+Compra|,?\s+(?:el|los)\s+[ií]tems?|,?\s+por\s+la\s+suma|,?\s+la\s+suma"
    r"|,?\s+por\s+un\s+monto"
    r"|,?\s+[Cc][Uu][Ii][Tt]|,?\s+[Dd][Nn][Ii]|,?\s+instrumentad|,?\s+en\s+el\s+marco|,?\s+en\s+relaci[oó]n"
    r"|,\s|\.\s|$)"
)
_VENDOR_NAME = r"(?P<vendor>[A-ZÑÁÉÍÓÚ][^,\n]{2,90}?)"
_VENDOR_NAME_NO_PAREN = r"(?P<vendor>[A-ZÑÁÉÍÓÚ][^,\n(]{2,90}?)"
_VENDOR_NAME_LOOSE = r"(?P<vendor>[A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚa-zñáéíóú0-9. &\-]{2,90}?)"
_VENDOR_PATTERNS = [
    re.compile(_ADJUDICAR_VERB + r'\s+a\s+la\s+firma\s+["“]([^"”\n]{3,90})["”]'),
    re.compile(_ADJUDICAR_VERB + r'\s+al\s+proveedor\s+["“]([^"”\n]{3,90})["”]'),
    re.compile(_ADJUDICAR_VERB + r'\s+a\s+la\s+empresa\s+["“]([^"”\n]{3,90})["”]'),
    re.compile(_ADJUDICAR_VERB + r"\s+a\s+la\s+empresa\s+" + _VENDOR_NAME + _VENDOR_STOP),
    re.compile(_ADJUDICAR_VERB + r"\s+a\s+la\s+firma\s+" + _VENDOR_NAME + _VENDOR_STOP),
    re.compile(_ADJUDICAR_VERB + r"\s+al\s+proveedor\s+" + _VENDOR_NAME + _VENDOR_STOP),
    re.compile(_ADJUDICAR_VERB + r"\s+al\s+oferente\s+" + _VENDOR_NAME + _VENDOR_STOP),
    re.compile(_ADJUDICAR_VERB + r"\s+a\s+la\s+Sra\.\s+" + _VENDOR_NAME_NO_PAREN + _VENDOR_STOP),
    re.compile(_ADJUDICAR_VERB + r"\s+al\s+Sr\.\s+" + _VENDOR_NAME_NO_PAREN + _VENDOR_STOP),
    re.compile(_ADJUDICAR_VERB + r'\s+a\s+["“]([^"”\n]{3,90})["”]'),
    # "Adjudicase el Concurso de Precios Nº 02/25 al proveedor Simos Marcelo":
    # the procedure name sits between the verb and the connector, so none of
    # the patterns above can reach the vendor.
    re.compile(
        _ADJUDICAR_VERB
        + r"\s+(?:el|la|los)\s+(?:Concurso|Licitaci[oó]n|Compra)[^,\n]{0,60}?"
        + r"\s+al?\s+(?:proveedor|firma|empresa)\s+[\"“]?"
        + _VENDOR_NAME_NO_PAREN
        + _VENDOR_STOP
    ),
    re.compile(_ADJUDICAR_VERB + r"\s+al?\s+" + _VENDOR_NAME_LOOSE + _VENDOR_STOP),
]

# Direct-contract clauses trail the counterparty name with different
# boilerplate than competitive awards ("para la Obra mencionada en el
# Artículo 1º", "cuya razón social es...", a dash-delimited trade name), so
# they need their own stop set on top of the shared one.
_VENDOR_STOP_DIRECT = (
    r'(?=["”]|,?\s+para\s+(?:la|el|el\s+servicio|la\s+prestaci)|,?\s+cuya\s+raz[oó]n'
    r"|,?\s+de\s+la\s+(?:Reparaci|provisi|adquisici)|,?\s+por\s+la\s+suma"
    r"|,?\s+por\s+un\s+(?:valor|monto)|\s+[–—]|\s+-\s*[A-ZÑÁÉÍÓÚ]|,?\s*\(CUIT"
    r"|,\s|\.\s|$)"
)
# An optional opening quote is tolerated because several decretos open a
# quoted name and never close it (e.g. "el proveedor “HOSPITAL NAVAL PUERTO
# BELGRANO cuya razón social..."), which no balanced-quote pattern can catch.
_DIRECT_CONNECTOR = r"\s+(?:con|a|de)\s+"
_DIRECT_VENDOR_PATTERNS = [
    re.compile(
        _DIRECT_CONTRACT_VERB + _DIRECT_CONNECTOR + r'(?:la\s+)?firmar?\s+["“]([^"”\n]{3,90})["”]'
    ),
    re.compile(
        _DIRECT_CONTRACT_VERB
        + _DIRECT_CONNECTOR
        + r'(?:el|la)\s+proveedor[ao]?\s+["“]([^"”\n]{3,90})["”]'
    ),
    re.compile(
        _DIRECT_CONTRACT_VERB
        + _DIRECT_CONNECTOR
        + r'(?:el|la)\s+proveedor[ao]?\s+["“]?'
        + _VENDOR_NAME
        + _VENDOR_STOP_DIRECT
    ),
    re.compile(
        _DIRECT_CONTRACT_VERB
        + _DIRECT_CONNECTOR
        + r'(?:la\s+)?firmar?\s+["“]?'
        + _VENDOR_NAME
        + _VENDOR_STOP_DIRECT
    ),
    re.compile(_DIRECT_CONTRACT_VERB + r"\s+con\s+" + _VENDOR_NAME_NO_PAREN + _VENDOR_STOP_DIRECT),
]

_AMOUNT_PATTERN = re.compile(r"\(\s*\$\s*([\d.,]{4,20})\s*\.?-?\s*\)")
_WORDS_AMOUNT_PATTERN = re.compile(r"PESOS\s+(.{3,220}?)\(\s*\$", re.DOTALL | re.IGNORECASE)

_EXPEDIENTE_PATTERNS = [
    re.compile(r"(EX-?\d{4}-\d{6,10}[\s\-]+[A-Z]+(?:-[A-Z]+)?#[A-Z]+)"),
    re.compile(r"[Ee]xpte\.?\s*(?:digital\s*)?(?:N[ºo°]?\.?\s*)?([A-Z]{1,3}\s*-\s*\d+\s*/\s*\d{2,4})"),
    re.compile(r"[Ee]xpediente\s*(?:digital\s*)?(?:N[ºo°]?\.?\s*)?([A-Z]{1,3}\s*-\s*\d+\s*/\s*\d{2,4})"),
    re.compile(r"actuaciones\s+caratuladas\s+como\s+([A-Z0-9][A-Z0-9./\-]{2,30})", re.IGNORECASE),
]

_PROC_NUM = r"N(?:ro)?[ºo°]?\.?\s*(\d+\s*/\s*\d{2,4})"
_PROCEDIMIENTO_PATTERNS = [
    (re.compile(rf"Licitaci[oó]n\s+P[uú]blica\s+{_PROC_NUM}", re.IGNORECASE), "Licitación Pública"),
    (re.compile(rf"Licitaci[oó]n\s+Privada\s+{_PROC_NUM}", re.IGNORECASE), "Licitación Privada"),
    (re.compile(rf"Concurso\s+de\s+Precios\s+{_PROC_NUM}", re.IGNORECASE), "Concurso de Precios"),
    (re.compile(rf"Compra\s+Directa\s+{_PROC_NUM}", re.IGNORECASE), "Compra Directa"),
    (
        re.compile(rf"Contrataci[oó]n\s+[Dd]irecta\s+{_PROC_NUM}", re.IGNORECASE),
        "Contratación Directa",
    ),
]
_DIRECT_CONTRACT_NUMBERLESS = re.compile(r"Contrataci[oó]n\s+[Dd]irecta", re.IGNORECASE)


def _extract_vendor(clause: str) -> str | None:
    for pat in (*_VENDOR_PATTERNS, *_DIRECT_VENDOR_PATTERNS):
        m = pat.search(clause)
        if not m:
            continue
        vendor = (m.groupdict().get("vendor") or m.group(1)).strip().strip('"“”').strip()
        # Strip trailing punctuation AND whitespace together: decretos are
        # inconsistently spaced before the closing period ("DROGUERIA IB SA ."),
        # and a lone `.rstrip(".,")` would leave the space behind, emitting a
        # vendor name with an invisible trailing blank.
        vendor = re.sub(r"\s+", " ", vendor).rstrip(" .,")
        if len(vendor) < 3:
            continue
        last_token = vendor.split()[-1].rstrip(".")
        if len(last_token) == 1 and last_token.isalpha():
            continue  # looks truncated (e.g. "JOSE M", cut at a mid-name abbreviation)
        return vendor
    return None


def _extract_amount(clause: str) -> int | None:
    """Cross-validates the numeric figure against the spelled-out words.
    Returns the whole-peso amount only when both readings agree exactly.
    """
    amounts = _AMOUNT_PATTERN.findall(clause)
    if len(amounts) != 1:
        return None
    numeric = parse_ars_numeric(amounts[0])
    wm = _WORDS_AMOUNT_PATTERN.search(clause)
    if not wm:
        return None
    words_phrase = re.split(r"\bCON\b", wm.group(1).upper())[0]
    spelled = words_to_number(words_phrase)
    if numeric is None or spelled is None or numeric != spelled:
        return None
    return numeric


def _extract_expediente(block_text: str) -> str | None:
    head = block_text[:1500]  # the "Visto" section, near the top of the block
    for pat in _EXPEDIENTE_PATTERNS:
        m = pat.search(head)
        if m:
            return re.sub(r"\s+", "", m.group(1))
    return None


def _extract_procedimiento(block_text: str) -> str | None:
    head = block_text[:2000]
    for pat, label in _PROCEDIMIENTO_PATTERNS:
        m = pat.search(head)
        if m:
            return f"{label} Nº {re.sub(r'\\s+', '', m.group(1))}"
    # Direct contracts usually carry no tender number at all -- there was no
    # tender. Label the modality anyway: WHICH modality was used is itself
    # the accountability signal, and dropping it to None would render these
    # rows indistinguishable from an unparsed competitive procedure.
    if _DIRECT_CONTRACT_NUMBERLESS.search(head):
        return "Contratación Directa"
    return None


def _extract_objeto(clause: str) -> str:
    """Brief, verbatim-from-decreto description: the operative clause text
    itself (trimmed of the vendor mention and generic boilerplate), never a
    paraphrase. Truncated to keep the row compact.
    """
    text = re.sub(r"\s+", " ", clause).strip()
    text = re.sub(
        r"\s*-?\s*conforme descripci[oó]n,? cantidad y caracter[ií]sticas emergentes de la "
        r"documentaci[oó]n licitatoria aprobada para la presente-?,?",
        "",
        text,
        flags=re.IGNORECASE,
    )
    return text[:220].strip()


# --- Bidder field ("oferentes") -------------------------------------------
#
# The decreto names the winner; the losing bidders live in the Considerando
# recital, if they are published at all. Recovering them is what lets the
# portal say how contested a tender actually was -- the single most probative
# competition fact, and today invisible.
#
# THE HONEST-UNKNOWN RULE. Only 57% of competitive procedures publish a
# parseable bidder list, and direct contracts have no competitors by
# construction. An empty array would read as "nobody else bid", which is a
# claim the documents do not support. So the field is NEVER an empty list and
# `cantidad` is NEVER 0: every row carries an explicit `estado` that
# distinguishes "we know the list" from "the law required no competitors"
# from "the Municipality did not publish it".
_ENACTING_FORMULA = re.compile(r"\bDECRETA\b")
# "según detalle oferta aceptada, solicitud de gastos y demás documentación"
# appears in direct contracts and is never a bidder enumeration.
_OFERENTES_BLACKLIST = re.compile(r"oferta\s+aceptada", re.IGNORECASE)
_OFERENTE_LIST = r"(?P<list>.{5,400}?)"
_OFERENTES_TEMPLATES = [
    re.compile(
        r"(?:los\s+)?oferentes:?\s+" + _OFERENTE_LIST + r"\s+presentaron\s+(?:las\s+)?ofertas",
        re.I,
    ),
    re.compile(
        r"(?:los\s+)?proveedores:?\s+"
        + _OFERENTE_LIST
        + r"\s+presentaron\s+(?:las\s+)?(?:ofertas|cotizaciones)",
        re.I,
    ),
    re.compile(
        r"abiertas\s+las\s+ofertas.{0,40}?perteneciente[s]?\s+a\s+"
        + _OFERENTE_LIST
        + r"(?=\.|\s+Que\s)",
        re.I,
    ),
    re.compile(
        r"presentaci[o\u00f3]n\s+de\s+\w+\s+ofertas[;:,]\s*"
        + _OFERENTE_LIST
        + r"(?=\.\s|\s+Que\s)",
        re.I,
    ),
    re.compile(
        r"como\s+Oferta\s*(?:N[\u00ba\u00b0o]?\s*)?1\b\s*"
        + _OFERENTE_LIST
        + r"(?=\.\s*-|\s+Que,?\s)",
        re.I,
    ),
    re.compile(
        r"se\s+recepcionaron\s+\w+\s+ofertas:?\s+" + _OFERENTE_LIST + r"(?=\.|\s+Que\s)",
        re.I,
    ),
]
# Splitting is deliberately conservative, because a wrongly split name
# publishes a company that never bid. The decretos routinely write natural
# persons surname-first ("Ebers, Omar Marciano"; "Ripoll, Miguel A."), so a
# bare comma is NOT a safe separator. Quoted spans are the dominant published
# form and are extracted verbatim; only when no quoting exists do we fall
# back to splitting, and then only on separators that never occur inside a
# single name.
_OFERENTE_QUOTED = re.compile(r"[\"“]([^\"“”]{3,90})[\"”]")
_OFERENTE_SPLIT = re.compile(r"\s*(?:;|\sy\s|\se\s)\s*")
_OFERENTE_NOISE = re.compile(
    r"^(?:la\s+(?:firma|empresa)|el\s+proveedor|los?\s+Sres?\.?|Sr[a]?\.|"
    r"la\s+Oferta\s*N?[º°o]?\s*\d*|Oferta\s*N?[º°o]?\s*\d*|"
    r"(?:la\s+)?(?:primera|segunda|tercera|cuarta)\s*(?:perteneciente\s+a)?|"
    r"se\s+constat[oó]\s+la\s+presentada\s+por|perteneciente\s+a[l]?)\s*",
    re.IGNORECASE,
)


def _clean_oferente(raw: str) -> str | None:
    name = re.sub(r"\s+", " ", raw).strip().strip("\"“”'").strip()
    previous = None
    while previous != name:
        previous = name
        name = _OFERENTE_NOISE.sub("", name).strip().strip("\"“”'").strip()
    # Drop any trailing quoted amount ("por la suma de PESOS ... ($ 1.000)").
    name = re.split(r"\s+(?:por|cuya|con)\s+", name)[0].strip().rstrip(".,;:-").strip()
    if len(name) < 3 or len(name) > 90 or not name[0].isupper():
        return None
    return name


def _extract_oferentes(
    block_text: str, procedimiento: str | None, winner: str, aliases: dict[str, str]
) -> dict[str, Any]:
    """Recover the bidder field for one awarded row.

    Returns an object that always states WHY a list is absent, never a bare
    empty array. A parse is accepted only when the awarded vendor itself
    appears in it (the winner-presence check) -- that is what catches a
    truncated capture before it publishes a nonsense bidder name.
    """
    unknown = {"estado": "no-publicado", "cantidad": None, "nombres": [], "quote": None}
    if procedimiento == "Contratación Directa":
        return {"estado": "sin-competencia", "cantidad": None, "nombres": [], "quote": None}

    considerando = _ENACTING_FORMULA.split(block_text)[0]
    # Flatten first: bidder enumerations wrap mid-sentence, and the
    # line-sensitive form of these patterns matches nothing at all.
    flat = re.sub(r"\s+", " ", considerando)
    if _OFERENTES_BLACKLIST.search(flat):
        return unknown

    def canonical(name: str) -> str:
        key = re.sub(r"\s+", " ", name).strip().upper()
        return aliases.get(key, name)

    for template in _OFERENTES_TEMPLATES:
        match = template.search(flat)
        if not match:
            continue
        raw_list = match.group("list")
        quoted = _OFERENTE_QUOTED.findall(raw_list)
        chunks = quoted if len(quoted) >= 2 else _OFERENTE_SPLIT.split(raw_list)
        names = []
        for chunk in chunks:
            cleaned = _clean_oferente(chunk)
            if cleaned and cleaned not in names:
                names.append(canonical(cleaned))
        if len(names) < 2:
            continue
        # A surviving comma is unresolvable: "Ripoll, Miguel A. y Di Bella,
        # Salvador E. S.H" is ONE sociedad de hecho, while "Miguera Carla
        # Anabella, Diego Pedro Botta" is TWO bidders, and nothing in the text
        # distinguishes them. Splitting would invent a bidder; not splitting
        # would undercount the field and make the tender look less contested
        # than it was -- unfair to the Municipality. Refuse instead, and let
        # the row say the list was not published.
        if any("," in name for name in names):
            continue
        # Winner-presence check. Compare on the significant tokens rather than
        # raw substrings: "Ebers" alone must not be accepted as proof that
        # "OMAR MARCIANO EBERS" is in the list, or a mis-split capture would
        # publish fabricated bidders under a partially matching name.
        def tokens(value: str) -> set[str]:
            return {t for t in re.split(r"[^A-Za-zÑÁÉÍÓÚñáéíóú]+", value.upper()) if len(t) > 2}

        winner_tokens = tokens(canonical(winner))
        if not winner_tokens or not any(
            winner_tokens.issubset(tokens(n)) or tokens(n).issubset(winner_tokens) for n in names
        ):
            continue  # truncated or mis-scoped capture -- refuse it
        return {
            "estado": "listado",
            "cantidad": len(names),
            "nombres": names,
            "quote": match.group(0)[:400].strip(),
        }
    return unknown


def parse_block(block: dict) -> dict:
    """Extract every adjudicación row from one decree block.

    Returns ``{"expediente", "procedimiento", "rows": [...], "skippedActosCount"}``.
    ``skippedActosCount`` counts operative clauses that mentioned "Adjudicar"
    but could not be turned into a verified row (missing/ambiguous vendor,
    missing amount, or a spelled-vs-numeric amount mismatch) -- feeds the
    page's honest "N actos no pudieron parsearse automáticamente" note.
    """
    expediente = _extract_expediente(block["text"])
    procedimiento = _extract_procedimiento(block["text"])

    rows = []
    skipped = 0
    for clause in _ARTICULO_SPLIT.split(block["text"]):
        if not _OPERATIVE_CLAUSE.search(clause):
            continue
        vendor = _extract_vendor(clause)
        amount = _extract_amount(clause)
        if vendor is None or amount is None:
            skipped += 1
            continue
        rows.append(
            {
                "proveedor": vendor,
                "montoArs": amount,
                "objeto": _extract_objeto(clause),
            }
        )

    return {
        "expediente": expediente,
        "procedimiento": procedimiento,
        "rows": rows,
        "skippedActosCount": skipped,
    }


def find_candidate_decrees(text: str) -> list[dict]:
    """Full offline pass over one bulletin's normalized text: every decree
    block that yields at least one verified adjudicación row, each carrying
    its own number/year/fecha/expediente/procedimiento/rows.

    Blocks that mention "Adjudicar" but yield ZERO valid rows are NOT
    included in the returned candidates (nothing to cite), but their
    skipped-clause count is still meaningful for the caller's own tally --
    callers that need the full skip count should sum ``skippedActosCount``
    across ``parse_block`` results for every block, not just the returned
    candidates.
    """
    candidates = []
    for block in extract_decree_blocks(text):
        parsed = parse_block(block)
        if not parsed["rows"]:
            continue
        candidates.append(
            {
                "number": block["number"],
                "year": block["year"],
                "fecha": block["fecha"],
                "expediente": parsed["expediente"],
                "procedimiento": parsed["procedimiento"],
                "rows": parsed["rows"],
                "skippedActosCount": parsed["skippedActosCount"],
            }
        )
    return candidates


_DECRETO_KEY = re.compile(r"^\d{1,4}/\d{4}$")
_SUPERSESSION_SCOPES = ("full", "amount-only")


def load_curated_supersessions(path: Path) -> dict[str, dict[str, Any]]:
    """Load the curated superseded-decreto table (``etl/decreto_supersessions.yaml``
    -- see its header comment for why this is curated and not automated).

    Returns a ``{superseded decreto: entry}`` mapping for the ``supersessions``
    section only; ``not_superseded`` exists solely to keep the detector tests
    honest and is never consulted at build time.

    Raises ``ValueError`` on any malformed curation, because a silent mistake
    here either deletes public spending from the record or leaves a false
    overstatement standing. Same loader-guard discipline as
    ``deuda_historica.load_curated_anomalies`` and ``load_vendor_aliases``.
    """
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    entries = raw.get("supersessions") or {}
    not_superseded = raw.get("not_superseded") or {}

    curated: dict[str, dict[str, Any]] = {}
    claimed_by: dict[str, str] = {}
    for decreto, entry in entries.items():
        if not _DECRETO_KEY.match(str(decreto)):
            raise ValueError(
                f"etl/decreto_supersessions.yaml key {decreto!r} is not a 'N/YYYY' decreto"
            )
        if decreto in not_superseded:
            raise ValueError(
                f"etl/decreto_supersessions.yaml lists {decreto!r} in BOTH supersessions "
                "and not_superseded -- it cannot be both"
            )
        for field in ("quote", "bulletin", "motivo", "reviewedOn"):
            if not str(entry.get(field) or "").strip():
                raise ValueError(
                    f"etl/decreto_supersessions.yaml entry {decreto!r} has a blank {field} "
                    "-- an unjustified supersession is always a curation mistake"
                )
        scope = entry.get("scope")
        if scope not in _SUPERSESSION_SCOPES:
            raise ValueError(
                f"etl/decreto_supersessions.yaml entry {decreto!r} has scope {scope!r}; "
                f"expected one of {_SUPERSESSION_SCOPES}"
            )
        superseded_by = entry.get("supersededBy")
        if claimed_by.get(decreto) not in (None, superseded_by):
            raise ValueError(
                f"etl/decreto_supersessions.yaml decreto {decreto!r} is claimed by two "
                "different superseding acts"
            )
        claimed_by[decreto] = superseded_by

        if scope == "full" and not entry.get("replacedBy"):
            raise ValueError(
                f"etl/decreto_supersessions.yaml entry {decreto!r} has scope 'full' but no "
                "replacedBy -- we must know which decreto carries the surviving row"
            )
        if scope == "amount-only":
            published, vigente = entry.get("montoArsPublicado"), entry.get("montoArsVigente")
            if published is None or vigente is None:
                raise ValueError(
                    f"etl/decreto_supersessions.yaml entry {decreto!r} has scope 'amount-only' "
                    "but is missing montoArsPublicado or montoArsVigente"
                )
            if published == vigente:
                raise ValueError(
                    f"etl/decreto_supersessions.yaml entry {decreto!r} corrects an amount to "
                    "the same value it already had -- nothing to correct"
                )
        curated[str(decreto)] = dict(entry)
    return curated


def _apply_supersessions(
    rows: list[dict[str, Any]], curated: dict[str, dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Split parsed rows into (published rows, superseded rows).

    A ``scope: full`` row is dropped ONLY when its ``replacedBy`` decreto
    actually emitted a row for the same expediente -- the replacement-existence
    guard. Without it, a mis-curated or not-yet-archived replacement would
    erase real spending from the published record; with it, the row is kept and
    flagged ``supersessionPendiente`` instead. ``amount-only`` never drops: it
    rewrites the amount and preserves the originally published figure.
    """
    emitted: dict[str, set[str]] = {}
    for row in rows:
        emitted.setdefault(row["decreto"], set()).add(str(row.get("expediente") or ""))

    published: list[dict[str, Any]] = []
    superseded: list[dict[str, Any]] = []
    for row in rows:
        entry = curated.get(row["decreto"])
        if entry is None:
            published.append(row)
            continue

        if entry["scope"] == "amount-only":
            row = dict(row)
            row["montoArsOficialPublicado"] = entry["montoArsPublicado"]
            row["montoArs"] = entry["montoArsVigente"]
            row["supersede"] = {
                "instrumento": entry.get("supersededBy"),
                "scope": "amount-only",
                "motivo": entry["motivo"],
                "quote": entry["quote"],
            }
            published.append(row)
            continue

        replaced_by = entry["replacedBy"]
        if str(row.get("expediente") or "") not in emitted.get(replaced_by, set()):
            row = dict(row)
            row["supersessionPendiente"] = True
            published.append(row)
            continue

        superseded.append(
            {
                **row,
                "estado": "anulado",
                "supersededBy": entry.get("supersededBy"),
                "replacedBy": replaced_by,
                "motivo": entry["motivo"],
                "quote": entry["quote"],
            }
        )
    return published, superseded


def _fecha_to_iso(fecha: str) -> str:
    """Convert a decreto dateline "DD/MM/YYYY" into ISO "YYYY-MM-DD"."""
    day, month, year = fecha.split("/")
    return f"{year}-{month}-{day}"


def build_adjudicaciones(
    manifest_path: Path,
    *,
    text_extractor: Callable[[Path], str] | None = None,
    supersessions: dict[str, dict[str, Any]] | None = None,
    aliases: dict[str, str] | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the full `data/adjudicaciones.json` payload -- network-free,
    reads exclusively from the local archive (every SIBOM bulletin PDF
    archived under the ``sibom`` capability, plus every individual act HTML
    page archived under ``sibom-actos`` by ``etl archive --capability
    sibom-actos``, see ``sibom.discover_sibom_actos``).

    CORRECTNESS GATE: a row is only emitted when (1) `find_candidate_decrees`
    cross-validated its vendor + amount unambiguously AND (2) a matching
    ``sibom-actos`` manifest record exists to cite as its `sourceRef` --
    never publish a row without a citable, archived source. Every skip
    (parse-level or provenance-level) is counted in `skippedCount` so the
    page can honestly report how many acts could not be turned into a row.
    """
    if text_extractor is None:
        from .fallos import extract_pdf_text as text_extractor  # type: ignore[assignment]

    records = load_manifest(manifest_path)
    bulletin_records = [
        r for r in records if r["id"].startswith("sibom/boletin-") and r.get("status") == "ok"
    ]
    acto_records = {
        r["id"]: r
        for r in records
        if r["id"].startswith("sibom-actos/") and r.get("status") == "ok"
    }

    result_rows: list[dict[str, Any]] = []
    source_refs: set[str] = set()
    skipped_count = 0
    decrees_scanned = 0
    bulletin_dates: list[str] = []

    for bulletin_record in sorted(bulletin_records, key=lambda r: r["id"]):
        bulletin_key = bulletin_record["id"].rsplit("/", 1)[-1]  # boletin-036
        bulletin_number = int(bulletin_key.removeprefix("boletin-"))
        pdf_path = manifest_path.parent / bulletin_record["archived_path"]
        raw_text = text_extractor(pdf_path)
        text = normalize_bulletin_text(raw_text)

        for block in extract_decree_blocks(text):
            decrees_scanned += 1
            parsed = parse_block(block)
            skipped_count += parsed["skippedActosCount"]
            if not parsed["rows"]:
                continue

            bulletin_dates.append(_fecha_to_iso(block["fecha"]))
            slug = f"{bulletin_key}-decreto-{block['number']:03d}-{block['year']}"
            source_ref = f"sibom-actos/{slug}"
            acto_record = acto_records.get(source_ref)
            if acto_record is None:
                # Candidate parsed here but never archived (e.g. `archive
                # --capability sibom-actos` wasn't re-run yet) -- no citable
                # source, so every row from this decree is skipped rather
                # than published without provenance.
                skipped_count += len(parsed["rows"])
                continue

            for row in parsed["rows"]:
                source_refs.add(source_ref)
                result_rows.append(
                    {
                        "decreto": f"{block['number']}/{block['year']}",
                        "fecha": _fecha_to_iso(block["fecha"]),
                        "expediente": parsed["expediente"],
                        "proveedor": row["proveedor"],
                        "montoArs": row["montoArs"],
                        "procedimiento": parsed["procedimiento"],
                        "objeto": row["objeto"],
                        "oferentes": _extract_oferentes(
                            block["text"], parsed["procedimiento"], row["proveedor"], aliases or {}
                        ),
                        "bulletinNumber": bulletin_number,
                        "sourceRef": source_ref,
                    }
                )

    result_rows, superseded_rows = _apply_supersessions(result_rows, supersessions or {})

    generated_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")
    window_from = min(bulletin_dates) if bulletin_dates else None
    window_to = max(bulletin_dates) if bulletin_dates else None

    return {
        "generatedAt": generated_at,
        "windowFrom": window_from,
        "windowTo": window_to,
        "bulletinsScanned": len(bulletin_records),
        "decreesScanned": decrees_scanned,
        "skippedCount": skipped_count,
        "sourceRefs": sorted(source_refs),
        "records": result_rows,
        "supersessions": superseded_rows,
    }


def load_vendor_aliases(path: Path) -> dict[str, str]:
    """Load the curated vendor-name alias table (``etl/vendor_aliases.yaml``
    -- see its header comment for the curation discipline).

    Returns a ``{normalized variant: canonical display name}`` mapping.
    ``build_proveedores`` consults it by EXACT match after normalization;
    neither this loader nor the aggregation ever compares names for
    similarity. Raises ``ValueError`` on a merge with blank evidence (a
    merge nobody justified is always a curation mistake) or on a variant
    claimed by two different canonical names (an unresolvable contradiction
    that would silently depend on file order). Same loader-guard discipline
    as ``deuda_historica.load_curated_anomalies``.
    """
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    aliases: dict[str, str] = {}
    for entry in raw.get("aliases") or []:
        canonical = entry["canonical"]
        if not (entry.get("evidence") or "").strip():
            raise ValueError(
                f"etl/vendor_aliases.yaml entry for {canonical!r} has blank evidence "
                "-- a curated merge nobody justified is always a curation mistake"
            )
        for variant in entry.get("variants") or []:
            key = " ".join(variant.split()).upper()
            if key in aliases and aliases[key] != canonical:
                raise ValueError(
                    f"etl/vendor_aliases.yaml variant {variant!r} is claimed by two "
                    f"canonical names ({aliases[key]!r} and {canonical!r})"
                )
            aliases[key] = canonical
    return aliases


def build_proveedores(
    rows: list[dict[str, Any]],
    *,
    aliases: dict[str, str] | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Aggregate adjudicación rows into the reconstructed proveedores padrón:
    one entry per vendor with totalArs, count, first/last award date, and
    the decreto references backing the total.

    Grouping key: the vendor name, normalized (collapsed whitespace,
    uppercased) ONLY for matching purposes -- this merges formatting
    variants of the SAME literal string (e.g. "Omar Marciano EBERS" vs
    "OMAR MARCIANO EBERS"), it never fuzzy-matches different spellings or
    guesses that two different-looking names are the same real-world
    entity. The displayed name keeps the casing of the row that sorts
    first alphabetically, for a stable, deterministic choice.

    ``aliases`` is the ONLY exception, and it is human-curated: a
    ``{normalized variant: canonical}`` mapping from
    ``load_vendor_aliases`` that folds spellings a reviewer verified
    against the primary sources (shared CUIT, or an identical legal name
    apart from one municipal typo) into a single entry. Omitted, nothing
    merges beyond exact-string formatting variants -- the conservative
    default. Similarity is never inferred here; see
    ``etl/vendor_aliases.yaml`` for why that restraint matters.
    """
    aliases = aliases or {}
    groups: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = re.sub(r"\s+", " ", row["proveedor"]).strip().upper()
        canonical = aliases.get(key)
        display = canonical or row["proveedor"]
        if canonical:
            key = re.sub(r"\s+", " ", canonical).strip().upper()
        group = groups.setdefault(
            key,
            {
                "proveedor": display,
                "totalArs": 0,
                "count": 0,
                "dates": [],
                "decretoRefs": [],
            },
        )
        # A curated canonical name always wins; the alphabetical tie-break
        # only picks between formatting variants of the same literal string.
        if canonical:
            group["proveedor"] = canonical
        elif row["proveedor"] < group["proveedor"]:
            group["proveedor"] = row["proveedor"]
        group["totalArs"] += row["montoArs"]
        group["count"] += 1
        group["dates"].append(row["fecha"])
        if row["decreto"] not in group["decretoRefs"]:
            group["decretoRefs"].append(row["decreto"])

    proveedores = []
    for group in groups.values():
        dates = sorted(group["dates"])
        proveedores.append(
            {
                "proveedor": group["proveedor"],
                "totalArs": group["totalArs"],
                "count": group["count"],
                "firstDate": dates[0],
                "lastDate": dates[-1],
                "decretoRefs": group["decretoRefs"],
            }
        )
    proveedores.sort(key=lambda p: p["totalArs"], reverse=True)

    generated_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"generatedAt": generated_at, "proveedores": proveedores}
