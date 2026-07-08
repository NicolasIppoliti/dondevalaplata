"""Spanish cardinal-number parsing + es-AR numeric amount parsing.

Used exclusively by ``sibom_adjudicaciones.py`` as a cross-validation gate:
every SIBOM decreto adjudicación states its peso amount TWICE -- once spelled
out in words ("PESOS DIECISIETE MILLONES SETECIENTOS SESENTA MIL") and once
as a numeric figure in parentheses ("($ 17.760.000,00)"). A row is only
published when both readings agree exactly; disagreement (a real source typo,
an OCR/text-extraction defect, or a genuine drafting error in the decreto
itself) means the amount cannot be trusted unambiguously, so the caller
skips the row rather than guessing which reading is correct -- this module
never resolves a disagreement, it only detects one.
"""

from __future__ import annotations

import re
import unicodedata


def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


ONES = {
    "UN": 1, "UNO": 1, "UNA": 1, "DOS": 2, "TRES": 3, "CUATRO": 4, "CINCO": 5,
    "SEIS": 6, "SIETE": 7, "OCHO": 8, "NUEVE": 9, "DIEZ": 10, "ONCE": 11,
    "DOCE": 12, "TRECE": 13, "CATORCE": 14, "QUINCE": 15, "DIECISEIS": 16,
    "DIECISIETE": 17, "DIECIOCHO": 18, "DIECINUEVE": 19, "VEINTE": 20,
    "VEINTIUN": 21, "VEINTIUNO": 21, "VEINTIDOS": 22, "VEINTITRES": 23,
    "VEINTICUATRO": 24, "VEINTICINCO": 25, "VEINTISEIS": 26, "VEINTISIETE": 27,
    "VEINTIOCHO": 28, "VEINTINUEVE": 29,
}
TENS = {
    "TREINTA": 30, "CUARENTA": 40, "CINCUENTA": 50, "SESENTA": 60,
    "SETENTA": 70, "OCHENTA": 80, "NOVENTA": 90,
}
HUNDREDS = {
    "CIEN": 100, "CIENTO": 100, "DOSCIENTOS": 200, "TRESCIENTOS": 300,
    "CUATROCIENTOS": 400, "QUINIENTOS": 500, "SEISCIENTOS": 600,
    "SETECIENTOS": 700, "OCHOCIENTOS": 800, "NOVECIENTOS": 900,
}
SCALE = {"MIL": 1_000, "MILLON": 1_000_000, "MILLONES": 1_000_000}


def words_to_number(phrase: str) -> int | None:
    """Convert a spelled-out Spanish cardinal number phrase to an int.

    Returns ``None`` only when the phrase contains NO recognizable number
    token at all. Stray/unknown tokens (connectors, OCR noise, a misspelled
    hundreds word) are otherwise silently skipped -- this is safe because
    every caller cross-checks the result against the numeric figure printed
    alongside it; an under/over-count from a skipped token simply fails
    that cross-check and the row gets skipped, never published wrong.
    """
    text = _strip_accents(phrase).upper()
    tokens = re.findall(r"[A-Z]+", text)
    total = 0
    current = 0
    matched_any = False
    for tok in tokens:
        if tok == "Y":
            continue
        if tok in ONES:
            current += ONES[tok]
            matched_any = True
        elif tok in TENS:
            current += TENS[tok]
            matched_any = True
        elif tok in HUNDREDS:
            current += HUNDREDS[tok]
            matched_any = True
        elif tok in SCALE:
            current = current or 1
            total += current * SCALE[tok]
            current = 0
            matched_any = True
        # else: unknown token, ignored (see docstring)
    total += current
    return total if matched_any else None


def parse_ars_numeric(raw: str) -> int | None:
    """Parse an es-AR formatted amount like ``17.760.000,00`` into whole
    pesos (cents truncated). ``.`` = thousands separator, ``,`` = decimal.

    Some source decretos misprint the decimal separator as ``.`` instead of
    ``,`` (e.g. ``4.712.500.00`` meaning $4.712.500,00) -- when there is no
    comma AND the string has more than one ``.``-separated group AND the
    last group is exactly 2 digits, that last group is treated as the
    (mistyped) decimal part rather than another thousands group.

    Returns ``None`` if the string doesn't look like a valid amount at all.
    """
    raw = raw.strip().rstrip(".-").strip()
    if not raw:
        return None
    if "," in raw:
        integer_part, _, _cents = raw.rpartition(",")
        integer_part = integer_part.replace(".", "")
    else:
        parts = raw.split(".")
        if len(parts) > 1 and len(parts[-1]) == 2:
            integer_part = "".join(parts[:-1])
        else:
            integer_part = raw.replace(".", "")
    if not integer_part.isdigit():
        return None
    return int(integer_part)
