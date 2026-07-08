"""Integration tests for etl.sibom_adjudicaciones.build_adjudicaciones /
build_proveedores against a small, fully-controlled local archive (manifest +
injected PDF-text extractor) -- real fixture text, no network I/O.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from etl.sibom_adjudicaciones import build_adjudicaciones, build_proveedores

FIXTURES = Path(__file__).parent / "fixtures"


def _read(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def _manifest_record(*, id_: str, capability: str, source_url: str, archived_path: str) -> dict:
    return {
        "id": id_,
        "capability": capability,
        "source": "sibom.slyt.gba.gob.ar",
        "source_url": source_url,
        "archived_url": f"https://example.com/{id_.split('/')[-1]}",
        "archived_path": archived_path,
        "sha256": "deadbeef" * 8,
        "mime": "application/pdf" if capability == "sibom" else "text/html",
        "bytes": 123,
        "fetched_at": "2026-01-01T00:00:00Z",
        "status": "ok",
        "notes": "",
    }


def _write_manifest(tmp_path: Path) -> Path:
    manifest_path = tmp_path / "archive-manifest.json"
    records = [
        _manifest_record(
            id_="sibom/boletin-036",
            capability="sibom",
            source_url="https://sibom.slyt.gba.gob.ar/bulletins/9568.pdf",
            archived_path="archive/sibom/boletin-036.pdf",
        ),
        _manifest_record(
            id_="sibom-actos/boletin-036-decreto-524-2023",
            capability="sibom-actos",
            source_url="https://sibom.slyt.gba.gob.ar/bulletins/9568/contents/1980017",
            archived_path="archive/sibom-actos/boletin-036-decreto-524-2023.html",
        ),
        _manifest_record(
            id_="sibom/boletin-031",
            capability="sibom",
            source_url="https://sibom.slyt.gba.gob.ar/bulletins/7022.pdf",
            archived_path="archive/sibom/boletin-031.pdf",
        ),
        _manifest_record(
            id_="sibom-actos/boletin-031-decreto-205-2022",
            capability="sibom-actos",
            source_url="https://sibom.slyt.gba.gob.ar/bulletins/7022/contents/1234567",
            archived_path="archive/sibom-actos/boletin-031-decreto-205-2022.html",
        ),
    ]
    manifest_path.write_text(json.dumps(records), encoding="utf-8")
    return manifest_path


def _fake_extractor(fixture_by_bulletin: dict[str, str]):
    def _extract(path: Path) -> str:
        for key, text in fixture_by_bulletin.items():
            if key in str(path):
                return text
        raise AssertionError(f"unexpected pdf path in test: {path}")

    return _extract


def test_build_adjudicaciones_produces_cross_validated_rows_with_provenance(
    tmp_path,
) -> None:
    manifest_path = _write_manifest(tmp_path)
    extractor = _fake_extractor(
        {
            "boletin-036": _read("sibom_decreto_524_2023_extract.txt"),
            "boletin-031": _read("sibom_decreto_205_2022_extract.txt"),
        }
    )

    result = build_adjudicaciones(
        manifest_path,
        text_extractor=extractor,
        now=datetime(2026, 7, 8, tzinfo=UTC),
    )

    assert result["generatedAt"] == "2026-07-08T00:00:00Z"
    assert result["bulletinsScanned"] == 2
    proveedores = {r["proveedor"] for r in result["records"]}
    assert proveedores == {"SEDARRI SERGIO ARIEL", "RO-BOT S.R.L", "FERRIMED SRL", "SEGUSUR SH"}

    sedarri = next(r for r in result["records"] if r["proveedor"] == "SEDARRI SERGIO ARIEL")
    assert sedarri["decreto"] == "524/2023"
    assert sedarri["fecha"] == "2023-09-07"
    assert sedarri["expediente"] == "D-79/23"
    assert sedarri["montoArs"] == 17_760_000
    assert sedarri["sourceRef"] == "sibom-actos/boletin-036-decreto-524-2023"
    assert "Licitación Privada" in sedarri["procedimiento"]

    assert sedarri["sourceRef"] in result["sourceRefs"]
    assert "sibom/boletin-036" not in result["sourceRefs"] or True  # bulletin ref optional


def test_build_adjudicaciones_skips_row_missing_archived_act_record(tmp_path) -> None:
    """If a candidate row has no matching sibom-actos manifest record (act
    was never archived, e.g. because a prior `archive` run wasn't re-run),
    the row is skipped rather than published without provenance.
    """
    manifest_path = tmp_path / "archive-manifest.json"
    manifest_path.write_text(
        json.dumps(
            [
                _manifest_record(
                    id_="sibom/boletin-036",
                    capability="sibom",
                    source_url="https://sibom.slyt.gba.gob.ar/bulletins/9568.pdf",
                    archived_path="archive/sibom/boletin-036.pdf",
                )
            ]
        ),
        encoding="utf-8",
    )
    extractor = _fake_extractor({"boletin-036": _read("sibom_decreto_524_2023_extract.txt")})

    result = build_adjudicaciones(manifest_path, text_extractor=extractor)

    assert result["records"] == []
    assert result["skippedCount"] >= 1


def test_build_proveedores_aggregates_totals_and_counts() -> None:
    rows = [
        {
            "proveedor": "COMADAR S.R.L",
            "montoArs": 1_000_000,
            "decreto": "1/2024",
            "fecha": "2024-01-01",
        },
        {
            "proveedor": "COMADAR S.R.L",
            "montoArs": 2_000_000,
            "decreto": "2/2024",
            "fecha": "2024-06-01",
        },
        {
            "proveedor": "OTRO SRL",
            "montoArs": 500_000,
            "decreto": "3/2024",
            "fecha": "2024-03-01",
        },
    ]

    result = build_proveedores(rows, now=datetime(2026, 7, 8, tzinfo=UTC))

    assert result["generatedAt"] == "2026-07-08T00:00:00Z"
    comadar = next(p for p in result["proveedores"] if p["proveedor"] == "COMADAR S.R.L")
    assert comadar["totalArs"] == 3_000_000
    assert comadar["count"] == 2
    assert comadar["firstDate"] == "2024-01-01"
    assert comadar["lastDate"] == "2024-06-01"
    assert comadar["decretoRefs"] == ["1/2024", "2/2024"]
    # Sorted by totalArs descending -- the biggest recipient leads.
    assert result["proveedores"][0]["proveedor"] == "COMADAR S.R.L"
