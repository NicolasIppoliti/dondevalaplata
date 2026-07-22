"""Unit tests for the curated vendor-alias table (etl/vendor_aliases.yaml)
and its use by `build_proveedores`.

The table is the ONLY mechanism allowed to fold two differently spelled
adjudicación rows into one padrón entry; `build_proveedores` has no
similarity logic of its own. These tests pin both halves of that contract:
the loader rejects malformed curation, and the aggregation applies the
table by exact match only.
"""

from pathlib import Path

import pytest
import yaml

from etl.sibom_adjudicaciones import build_proveedores, load_vendor_aliases

ALIASES_PATH = Path(__file__).resolve().parents[1] / "vendor_aliases.yaml"


def _row(proveedor: str, monto: int, decreto: str, fecha: str) -> dict:
    return {
        "proveedor": proveedor,
        "montoArs": monto,
        "decreto": decreto,
        "fecha": fecha,
    }


def test_load_vendor_aliases_maps_each_variant_to_its_canonical() -> None:
    aliases = load_vendor_aliases(ALIASES_PATH)

    assert aliases["COMADAR SRL"] == "COMADAR S.R.L"
    assert aliases["EQUIPO DE SERVICIOS PORTUARIOS RUMAX S.R.L"] == (
        "EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L"
    )
    # Keys are normalized (collapsed whitespace, upper-cased) for exact match.
    assert all(key == " ".join(key.split()).upper() for key in aliases)


def test_load_vendor_aliases_rejects_an_entry_without_evidence(tmp_path) -> None:
    """A merge with nothing written down to justify it is always a curation
    mistake -- this table's entire value is that a human recorded WHY.
    """
    path = tmp_path / "vendor_aliases.yaml"
    path.write_text(
        yaml.safe_dump(
            {"aliases": [{"canonical": "ACME S.A", "evidence": "  ", "variants": ["ACME SA"]}]}
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="blank evidence"):
        load_vendor_aliases(path)


def test_load_vendor_aliases_rejects_a_variant_claimed_by_two_canonicals(tmp_path) -> None:
    path = tmp_path / "vendor_aliases.yaml"
    path.write_text(
        yaml.safe_dump(
            {
                "aliases": [
                    {"canonical": "ACME S.A", "evidence": "CUIT match", "variants": ["ACME SA"]},
                    {"canonical": "OTHER S.A", "evidence": "CUIT match", "variants": ["ACME SA"]},
                ]
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="claimed by two canonical names"):
        load_vendor_aliases(path)


def test_build_proveedores_merges_curated_variants_into_one_entry() -> None:
    rows = [
        _row("EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L", 183_377_670, "639/2024", "2024-12-04"),
        _row("Equipo de Servicios Portuarios RUMAX S.R.L", 8_161_230, "384/2024", "2024-08-02"),
    ]

    result = build_proveedores(rows, aliases=load_vendor_aliases(ALIASES_PATH))

    assert len(result["proveedores"]) == 1
    entry = result["proveedores"][0]
    assert entry["proveedor"] == "EQUIPOS DE SERVICIOS PORTUARIOS RUMAX S.R.L"
    assert entry["totalArs"] == 191_538_900
    assert entry["count"] == 2
    assert entry["firstDate"] == "2024-08-02"
    assert entry["lastDate"] == "2024-12-04"
    assert entry["decretoRefs"] == ["639/2024", "384/2024"]


def test_build_proveedores_keeps_deliberate_abstentions_separate() -> None:
    """"Ro Bot S.A" and "RO-BOT S.R.L" state different legal forms and no
    decreto prints a CUIT, so the table deliberately does NOT merge them.
    """
    rows = [
        _row("Ro Bot S.A", 8_456_820, "194/2023", "2023-05-11"),
        _row("RO-BOT S.R.L", 2_556_689, "205/2022", "2022-05-10"),
    ]

    result = build_proveedores(rows, aliases=load_vendor_aliases(ALIASES_PATH))

    assert len(result["proveedores"]) == 2


def test_build_proveedores_does_not_fold_in_a_different_person_sharing_a_surname() -> None:
    """EBERS, Maximiliano (CUIT 20-36289663-1, insurance representation) is a
    different person from the works contractor Omar Marciano Ebers (CUIT
    20-05496692-0). Sharing a surname is not evidence, and the table must
    never collapse them.
    """
    rows = [
        _row("OMAR MARCIANO EBERS", 13_151_000, "426/2022", "2022-08-12"),
        _row("Ebers Omar Marciano", 25_355_532, "395/2025", "2025-09-01"),
        _row("EBERS, Maximiliano", 500_000, "999/2025", "2025-10-01"),
    ]

    result = build_proveedores(rows, aliases=load_vendor_aliases(ALIASES_PATH))

    by_name = {p["proveedor"]: p for p in result["proveedores"]}
    assert by_name["OMAR MARCIANO EBERS"]["totalArs"] == 38_506_532
    assert by_name["OMAR MARCIANO EBERS"]["count"] == 2
    assert by_name["EBERS, Maximiliano"]["totalArs"] == 500_000


def test_build_proveedores_without_aliases_never_merges() -> None:
    """The default stays conservative: no table, no merging."""
    rows = [
        _row("COMADAR S.R.L", 100, "1/2024", "2024-01-01"),
        _row("COMADAR SRL", 200, "2/2024", "2024-02-01"),
    ]

    result = build_proveedores(rows)

    assert len(result["proveedores"]) == 2


def test_every_curated_variant_matches_a_real_vendor_in_the_dataset() -> None:
    """Cross-check against the committed padrón: a curated variant that
    matches nothing is a typo that would silently never merge. Mirrors the
    same guard used for etl/deuda_anomalies.yaml.
    """
    import json

    repo_root = Path(__file__).resolve().parents[2]
    rows = json.loads((repo_root / "data" / "adjudicaciones.json").read_text())["records"]
    seen = {" ".join(r["proveedor"].split()).upper() for r in rows}

    aliases = load_vendor_aliases(ALIASES_PATH)
    unmatched = sorted(key for key in aliases if key not in seen)

    assert unmatched == [], f"curated variants matching no adjudicación row: {unmatched}"
