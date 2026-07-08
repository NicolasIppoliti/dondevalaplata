"""Unit tests for etl.sibom_adjudicaciones -- the SIBOM adjudicación parser
(feature G3). All fixtures are REAL text cut from actual archived SIBOM
bulletin PDFs (see tests/fixtures/sibom_decreto_*_extract.txt), never
synthetic, per the feature's "never fabricate" correctness rule.
"""

from pathlib import Path

from etl.sibom_adjudicaciones import (
    extract_decree_blocks,
    find_candidate_decrees,
    normalize_bulletin_text,
    parse_block,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _read(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_normalize_bulletin_text_fixes_ligatures_and_strips_page_footer() -> None:
    raw = (
        "Decreto Nº 1/2024\nCoronel Rosales, 01/01/2024\nVisto\nla ﬁrma "
        "oﬁcial\nMunicipio de Coronel Rosales\nBoletin Oficial Municipal\nPag. 5\nsiguiente"
    )
    normalized = normalize_bulletin_text(raw)
    assert "ﬁ" not in normalized
    assert "la firma oficial" in normalized
    assert "Boletin Oficial Municipal" not in normalized
    assert "siguiente" in normalized


def test_extract_decree_blocks_finds_single_decree() -> None:
    text = normalize_bulletin_text(_read("sibom_decreto_524_2023_extract.txt"))

    blocks = extract_decree_blocks(text)

    assert len(blocks) == 1
    assert blocks[0]["number"] == 524
    assert blocks[0]["year"] == "2023"
    assert blocks[0]["fecha"] == "07/09/2023"
    assert "SEDARRI SERGIO ARIEL" in blocks[0]["text"]


def test_parse_block_extracts_single_vendor_row_cross_validated() -> None:
    text = normalize_bulletin_text(_read("sibom_decreto_524_2023_extract.txt"))
    block = extract_decree_blocks(text)[0]

    result = parse_block(block)

    assert len(result["rows"]) == 1
    row = result["rows"][0]
    assert row["proveedor"] == "SEDARRI SERGIO ARIEL"
    assert row["montoArs"] == 17_760_000
    assert result["expediente"] == "D-79/23"
    assert "Licitación Privada" in result["procedimiento"]
    assert "4/23" in result["procedimiento"]
    assert result["skippedActosCount"] == 0


def test_parse_block_extracts_multiple_vendors_from_one_decree() -> None:
    text = normalize_bulletin_text(_read("sibom_decreto_205_2022_extract.txt"))
    block = extract_decree_blocks(text)[0]

    result = parse_block(block)

    vendors = {row["proveedor"]: row["montoArs"] for row in result["rows"]}
    assert vendors == {
        "RO-BOT S.R.L": 2_556_689,
        "FERRIMED SRL": 759_138,
        "SEGUSUR SH": 363_310,
    }
    assert result["skippedActosCount"] == 0


def test_parse_block_skips_row_with_internally_inconsistent_amount() -> None:
    """Decree 07/2023 adjudicates to TWO vendors: AGROINDUSTRIALES (amounts
    agree) and VIALERG (the decreto's own spelled-out amount, "TRECE MILLONES
    NOVENTA MIL" = 13.090.000, disagrees with its own printed numeric figure,
    "$13.000.090,00" = 13.000.090 -- a real inconsistency in the source
    document). The honest behavior is to publish the row that checks out and
    skip the one that doesn't, never guessing which figure is correct.
    """
    text = normalize_bulletin_text(_read("sibom_decreto_007_2023_extract.txt"))
    block = extract_decree_blocks(text)[0]

    result = parse_block(block)

    vendors = {row["proveedor"]: row["montoArs"] for row in result["rows"]}
    assert vendors == {"AGROINDUSTRIALES S.A": 32_732_088}
    assert "VIALERG" not in vendors
    assert result["skippedActosCount"] == 1


def test_find_candidate_decrees_end_to_end_on_multi_decree_bulletin() -> None:
    """A whole (small, synthetic-composition-of-real-fixtures) bulletin text
    containing three real decree blocks: two should yield candidates, one
    (207/2023, a routine non-adjudicación decree with no "Adjudicar" at all)
    should not appear in the candidates list at all.
    """
    text = "\n".join(
        [
            _read("sibom_decreto_524_2023_extract.txt"),
            "Decreto Nº 207/2023\nCoronel Rosales, 12/01/2023\nVisto\nmero trámite "
            "administrativo\nDECRETA\nARTICULO 1º: Regístrese.-",
            _read("sibom_decreto_007_2023_extract.txt"),
        ]
    )
    normalized = normalize_bulletin_text(text)

    candidates = find_candidate_decrees(normalized)

    numbers = {c["number"] for c in candidates}
    assert numbers == {524, 7}
    by_number = {c["number"]: c for c in candidates}
    assert by_number[524]["rows"][0]["proveedor"] == "SEDARRI SERGIO ARIEL"
    assert len(by_number[7]["rows"]) == 1  # VIALERG skipped, AGROINDUSTRIALES kept
