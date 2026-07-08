"""Unit tests for RAFAM "Estado de Ejecución del Presupuesto de Gastos" PDF
parsing (feature G2).

Fixtures (`fixtures/gasto_partida_*_extract.txt`) are real text cut directly
from `pypdf` extraction of the actual archived 274-page PDF -- not synthetic
text -- covering: two consecutive pages with NO repeated Jurisdicción/Apertura
header (hierarchy state must persist across a page break), several
wrapped/glued labels, and the final "TOTALES GENERALES" page whose column
order differs from every other row (see module docstring in
`etl/gasto_partida.py`).
"""

from pathlib import Path

import pytest

from etl.gasto_partida import (
    ObjetoAmounts,
    amounts_are_consistent,
    build_gasto_partida_tree,
    fix_known_font_defects,
    parse_amount,
    parse_objeto_leaves,
    parse_period,
    parse_totales_generales,
    strip_page_noise,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _read(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_parse_amount_handles_es_ar_thousands_and_decimal_separators() -> None:
    assert parse_amount("197.145.444,00") == pytest.approx(197145444.00)
    assert parse_amount("-651.345,74") == pytest.approx(-651345.74)
    assert parse_amount("0,00") == 0.0


def test_amounts_are_consistent_validates_arithmetic_identities() -> None:
    consistent = ObjetoAmounts(
        aprobado=100.0,
        modificaciones=-10.0,
        vigente=90.0,
        preventivo=0.0,
        compromiso=50.0,
        devengado=50.0,
        pagado=20.0,
        devengado_no_pagado=30.0,
    )
    assert amounts_are_consistent(consistent) is True

    inconsistent = ObjetoAmounts(
        aprobado=100.0,
        modificaciones=-10.0,
        vigente=999.0,  # wrong: should be 90.0
        preventivo=0.0,
        compromiso=50.0,
        devengado=50.0,
        pagado=20.0,
        devengado_no_pagado=30.0,
    )
    assert amounts_are_consistent(inconsistent) is False


def test_parse_objeto_leaves_extracts_every_leaf_row_across_a_page_break() -> None:
    text = strip_page_noise(_read("gasto_partida_pages_1_2_extract.txt"))
    leaves = parse_objeto_leaves(text)

    # 22 leaf partida rows span pages 1-2 of the real PDF; "Total X" subtotal
    # rows and bare group-header rows (e.g. "1.1.6.0 - Contribuciones
    # patronales") must NEVER be mistaken for a leaf.
    assert len(leaves) == 22
    codes = [leaf.code for _, leaf in leaves]
    assert codes[0] == "1.1.1.0"
    assert codes[-1] == "2.9.1.0"
    # "Total Contribuciones patronales" (a subtotal, no leading N.N.N.N code)
    # must not appear as a spurious leaf code.
    assert "Total" not in " ".join(leaf.name for _, leaf in leaves)


def test_parse_objeto_leaves_known_values_including_wrapped_label() -> None:
    text = strip_page_noise(_read("gasto_partida_pages_1_2_extract.txt"))
    leaves = {leaf.code: leaf for _, leaf in parse_objeto_leaves(text)}

    retribuciones = leaves["1.1.1.0"]
    assert retribuciones.name == "Retribuciones del cargo"
    assert retribuciones.vigente == pytest.approx(196494098.26)
    assert retribuciones.devengado == pytest.approx(33719811.76)
    assert retribuciones.pagado == pytest.approx(33719811.76)
    assert retribuciones.verified is True

    # Devengado > Pagado (a real "devengado no pagado" case) -- the amount
    # ordering bug this parser must get right (task honesty requirement).
    ipss = leaves["1.1.6.1"]
    assert ipss.name == "Instituto de Previsión Social"
    assert ipss.devengado == pytest.approx(4783271.12)
    assert ipss.pagado == pytest.approx(0.0)
    assert ipss.verified is True

    # Cross-page continuation (no repeated Jurisdicción/Apertura header on
    # page 2) -- this leaf's code+amounts appear on the SECOND page of the
    # fixture, proving state/order survives a `\n`-joined page boundary.
    seguro_vida = leaves["1.2.5.4"]
    assert seguro_vida.devengado == pytest.approx(3047.73)
    assert seguro_vida.pagado == pytest.approx(1989.02)


def test_build_gasto_partida_tree_groups_leaves_under_jurisdiccion_and_programa() -> None:
    text = strip_page_noise(_read("gasto_partida_pages_1_2_extract.txt"))
    tree = build_gasto_partida_tree(text)

    assert len(tree) == 1
    jurisdiccion = tree[0]
    assert jurisdiccion["code"] == "1110101000"
    assert jurisdiccion["name"] == "Conducción Superior"
    assert len(jurisdiccion["programas"]) == 1

    programa = jurisdiccion["programas"][0]
    assert programa["code"] == "01.00.00"
    assert programa["name"] == "Coordinación y gestión de políticas centrales"
    assert len(programa["objetos"]) == 22

    objeto_by_code = {o["code"]: o for o in programa["objetos"]}
    assert objeto_by_code["1.1.1.0"]["vigenteArs"] == pytest.approx(196494098.26)
    assert objeto_by_code["1.1.1.0"]["devengadoArs"] == pytest.approx(33719811.76)
    assert objeto_by_code["1.1.1.0"]["pagadoArs"] == pytest.approx(33719811.76)
    assert objeto_by_code["1.1.1.0"]["verified"] is True


def test_parse_period_reads_ejercicio_and_date_range() -> None:
    text = _read("gasto_partida_pages_1_2_extract.txt")
    period = parse_period(text)

    assert period["ejercicio"] == "2026"
    assert period["from"] == "2026-01-01"
    assert period["to"] == "2026-03-31"
    assert period["label"] == "1er trimestre 2026"


def test_parse_totales_generales_decodes_the_anomalous_column_order() -> None:
    """The grand-total row's "TOTALES GENERALES" label lands in the MIDDLE of
    the 8 amount tokens (a real pdftotext extraction quirk on this specific
    row, verified by hand against the real PDF) -- confirmed self-consistent
    via the same Vigente=Aprobado+Modificaciones and DevengadoNoPagado=
    Devengado-Pagado identities every regular row satisfies.
    """
    text = _read("gasto_partida_totales_generales_extract.txt")
    totals = parse_totales_generales(text)

    assert totals.aprobado == pytest.approx(44468531919.76)
    assert totals.modificaciones == pytest.approx(6000000.00)
    assert totals.vigente == pytest.approx(44474531919.76)
    assert totals.preventivo == pytest.approx(1727205865.34)
    assert totals.compromiso == pytest.approx(14457495888.87)
    assert totals.devengado == pytest.approx(11812638195.53)
    assert totals.pagado == pytest.approx(8533739337.95)
    assert totals.devengado_no_pagado == pytest.approx(3278898857.58)
    assert amounts_are_consistent(totals) is True


def test_parse_totales_generales_raises_when_not_found() -> None:
    with pytest.raises(ValueError, match="TOTALES GENERALES"):
        parse_totales_generales("no grand total here")


def test_fix_known_font_defects_repairs_the_three_discovered_mangled_glyphs() -> None:
    """A real, verified defect: some header lines in the actual PDF (bold
    Jurisdicción/Apertura Programática titles, a different embedded font
    subset than the body table) have a broken ToUnicode CMap for exactly
    three accented-vowel glyphs. Confirmed by scanning the FULL 274-page
    extracted text for every non-ASCII character outside the standard
    Spanish alphabet: only `į` (13x), `ķ` (10x) and `ś` (1x) ever appear,
    always substituting for `á`, `í` and `ú` respectively in real Spanish
    words (verified against "Secretaría", "Programática", "Pública") --
    never a legitimate character in this document, so this targeted
    substitution is safe.
    """
    mangled = "Secretarķa de Desarrollo ComunitarioApertura Programįtica"
    assert fix_known_font_defects(mangled) == (
        "Secretaría de Desarrollo ComunitarioApertura Programática"
    )
    assert fix_known_font_defects("Servicios Pśblicos") == "Servicios Públicos"
    # Idempotent / no-op on already-correct text.
    assert fix_known_font_defects("Conducción Superior") == "Conducción Superior"


def test_fix_known_font_defects_unbreaks_hierarchy_parsing_on_the_real_defect() -> None:
    """Without the fix, "Programįtica" (mangled) fails to match the literal
    "Apertura Program[aá]tica:" pattern -- the Jurisdicción's name capture
    then runs on unbounded (no `Apertura Programática:` lookahead stop),
    swallowing the ENTIRE following sub-tree as "name" text and, worse,
    causing every leaf underneath to attribute to the wrong Apertura
    Programática. This is a real fixture cut from page 124 of the actual
    PDF (jurisdicción "1110116000 - Secretaría de Desarrollo Comunitario")."""
    raw = _read("gasto_partida_font_defect_extract.txt")
    fixed = fix_known_font_defects(raw)
    tree = build_gasto_partida_tree(fixed)

    assert len(tree) == 1
    jurisdiccion = tree[0]
    # The name must be exactly the jurisdicción's own title -- NOT swallow
    # the "Apertura Programática:..." text or any objeto row that follows.
    assert jurisdiccion["name"] == "Secretaría de Desarrollo Comunitario"
    assert len(jurisdiccion["programas"]) == 1
    assert (
        jurisdiccion["programas"][0]["name"]
        == "Coordinación y Gestión de la Secretaría de Desarrollo Comunitario"
    )
