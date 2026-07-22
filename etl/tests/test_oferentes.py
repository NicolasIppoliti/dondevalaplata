"""Unit tests for the bidder field ("oferentes") extracted by
etl.sibom_adjudicaciones._extract_oferentes.

The field publishes the NAMES of companies as having bid on a public tender.
A wrongly split or hallucinated name is a false statement about a real firm,
and an undercounted field makes a tender look less contested than it was --
unfair to the Municipality. Both failure directions are worse than admitting
the list is unknown, so these tests pin precision, not coverage.

Fixtures are verbatim Spanish cut from real archived decretos.
"""

from etl.sibom_adjudicaciones import _extract_oferentes

ALIASES: dict[str, str] = {}


def _block(considerando: str) -> str:
    return (
        "Decreto Nº 1/2024\nCoronel Rosales, 01/01/2024\nVisto\n"
        f"{considerando}\nDECRETA\nARTICULO 1º: ..."
    )


def test_direct_contract_is_sin_competencia_never_zero_bidders() -> None:
    """A Contratación Directa has no competing bidders by construction. It must
    never render as "0 oferentes", which would read as a failed tender.
    """
    result = _extract_oferentes(_block("nada"), "Contratación Directa", "ACME S.A", ALIASES)

    assert result["estado"] == "sin-competencia"
    assert result["cantidad"] is None
    assert result["nombres"] == []


def test_competitive_tender_with_a_published_list_is_captured() -> None:
    """Decreto 639/2024, the ARS 183.377.670 LED works: exactly two bidders.
    This is the single most probative competition fact in the dataset.
    """
    block = _block(
        "Que efectuado el pertinente llamado licitatorio los oferentes "
        "“Equipos de Servicios Portuarios Rumax S.R.L.” y “Omar Marciano Ebers” "
        "presentaron ofertas y cotizaciones que corren agregadas."
    )

    result = _extract_oferentes(
        block, "Licitación Pública Nº 03/24", "EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L", ALIASES
    )

    assert result["estado"] == "listado"
    assert result["cantidad"] == 2
    assert "Omar Marciano Ebers" in result["nombres"]
    assert "Rumax" in " ".join(result["nombres"])
    assert "presentaron ofertas" in result["quote"]


def test_boilerplate_oferta_aceptada_is_never_parsed_as_a_bidder_list() -> None:
    """Direct contracts say "según detalle oferta aceptada, solicitud de gastos
    y demás documentación contractual". That is boilerplate, not a bidder field.
    """
    block = _block(
        "Que obra en las actuaciones presupuesto presentado por la firma Explorar "
        "Servicios Geológicos, según detalle oferta aceptada, solicitud de gastos y "
        "demás documentación contractual obrante en el presente expediente."
    )

    result = _extract_oferentes(block, "Concurso de Precios Nº 1/23", "Explorar", ALIASES)

    assert result["estado"] == "no-publicado"
    assert result["nombres"] == []


def test_competitive_tender_without_a_published_list_says_so() -> None:
    block = _block("Que se procedió a la apertura de sobres conforme el acta obrante en autos.")

    result = _extract_oferentes(block, "Licitación Privada Nº 2/24", "ACME S.A", ALIASES)

    assert result["estado"] == "no-publicado"
    assert result["cantidad"] is None


def test_ambiguous_comma_is_refused_rather_than_split_or_undercounted() -> None:
    """"Miguera Carla Anabella, Diego Pedro Botta" is TWO bidders; "Ripoll,
    Miguel A. y Di Bella, Salvador E. S.H" is ONE sociedad de hecho. Nothing in
    the text distinguishes them, so both must be refused: splitting invents a
    bidder, keeping them fused undercounts the field.
    """
    block = _block(
        "Que efectuadas las invitaciones pertinentes los proveedores Miguera Carla "
        "Anabella, Diego Pedro Botta y Sergio Ariel Sedarri presentaron las ofertas "
        "correspondientes."
    )

    result = _extract_oferentes(
        block, "Concurso de Precios Nº 9/22", "Sergio Ariel Sedarri", ALIASES
    )

    assert result["estado"] == "no-publicado"


def test_parse_is_refused_when_the_awarded_vendor_is_absent_from_the_list() -> None:
    """The winner must appear among the bidders. If it does not, the capture is
    truncated or mis-scoped and publishing it would attribute a bid to firms
    that were not in this tender at all.
    """
    block = _block(
        "Que los oferentes “ALFA S.A” y “BETA S.R.L” presentaron ofertas y cotizaciones."
    )

    result = _extract_oferentes(block, "Licitación Privada Nº 3/24", "GAMMA S.A", ALIASES)

    assert result["estado"] == "no-publicado"


def test_bidder_names_are_normalized_through_the_curated_alias_table() -> None:
    block = _block(
        "Que los oferentes “COMADAR SRL” y “EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L” "
        "presentaron ofertas."
    )

    result = _extract_oferentes(
        block,
        "Licitación Privada Nº 4/24",
        "COMADAR S.R.L",
        {"COMADAR SRL": "COMADAR S.R.L"},
    )

    assert result["estado"] == "listado"
    assert "COMADAR S.R.L" in result["nombres"]
    assert "COMADAR SRL" not in result["nombres"]
