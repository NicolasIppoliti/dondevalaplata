"""Unit tests for the `etl build-adjudicaciones` CLI wiring (etl.cli), G3.

Monkeypatches `build_adjudicaciones`/`build_proveedores` so this suite never
reads the real project archive/manifest -- it only proves the CLI wires
args -> build functions -> two JSON files on disk correctly.
"""

import argparse
import json

from etl import cli


def test_build_adjudicaciones_writes_both_data_files(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"

    fake_result = {
        "generatedAt": "2026-07-08T00:00:00Z",
        "windowFrom": "2022-05-01",
        "windowTo": "2026-03-18",
        "bulletinsScanned": 56,
        "decreesScanned": 2710,
        "skippedCount": 12,
        "sourceRefs": ["sibom-actos/boletin-036-decreto-524-2023"],
        "records": [
            {
                "decreto": "524/2023",
                "fecha": "2023-09-07",
                "expediente": "D-79/23",
                "proveedor": "SEDARRI SERGIO ARIEL",
                "montoArs": 17_760_000,
                "procedimiento": "Licitación Privada Nº 4/23",
                "objeto": "hotelería",
                "bulletinNumber": 36,
                "sourceRef": "sibom-actos/boletin-036-decreto-524-2023",
            }
        ],
    }

    def fake_build_adjudicaciones(manifest_path_arg, **kwargs):
        assert manifest_path_arg == manifest_path
        return fake_result

    def fake_build_proveedores(rows, **kwargs):
        assert rows == fake_result["records"]
        return {"generatedAt": "2026-07-08T00:00:00Z", "proveedores": []}

    monkeypatch.setattr(cli, "build_adjudicaciones", fake_build_adjudicaciones)
    monkeypatch.setattr(cli, "build_proveedores", fake_build_proveedores)

    aliases_path = tmp_path / "vendor_aliases.yaml"
    aliases_path.write_text("aliases: []\n", encoding="utf-8")

    args = argparse.Namespace(
        manifest_path=manifest_path,
        data_root=data_root,
        vendor_aliases_path=aliases_path,
    )
    exit_code = cli.run_build_adjudicaciones(args)

    assert exit_code == 0
    adjudicaciones = json.loads((data_root / "adjudicaciones.json").read_text(encoding="utf-8"))
    assert adjudicaciones == fake_result
    proveedores = json.loads((data_root / "proveedores.json").read_text(encoding="utf-8"))
    assert proveedores == {"generatedAt": "2026-07-08T00:00:00Z", "proveedores": []}


def test_build_adjudicaciones_parser_wires_default_vendor_aliases_path() -> None:
    parser = cli.build_parser()

    args = parser.parse_args(["build-adjudicaciones"])

    assert args.vendor_aliases_path == cli.DEFAULT_VENDOR_ALIASES_PATH
