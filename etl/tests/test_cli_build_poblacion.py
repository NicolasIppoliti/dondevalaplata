"""Unit tests for the `etl build-poblacion` CLI wiring (etl.cli).

Monkeypatches `build_poblacion_censo_2022` so this suite never reads the
real project archive/manifest -- same pattern as
test_cli_build_deuda_historica.py.
"""

import argparse
import json

from etl import cli


def test_build_poblacion_writes_data_file(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"

    def fake_build_poblacion_censo_2022(manifest_path_arg, **kwargs):
        assert manifest_path_arg == manifest_path
        return {
            "generatedAt": "2026-07-08T12:00:00Z",
            "censusYear": 2022,
            "sourceRefs": ["poblacion-censo/proyecciones-poblacion-2010-2025"],
            "municipios": [],
        }

    monkeypatch.setattr(
        cli, "build_poblacion_censo_2022", fake_build_poblacion_censo_2022
    )

    args = argparse.Namespace(manifest_path=manifest_path, data_root=data_root)
    exit_code = cli.run_build_poblacion(args)

    assert exit_code == 0
    written = json.loads(
        (data_root / "poblacion-censo-2022.json").read_text(encoding="utf-8")
    )
    assert written == {
        "generatedAt": "2026-07-08T12:00:00Z",
        "censusYear": 2022,
        "sourceRefs": ["poblacion-censo/proyecciones-poblacion-2010-2025"],
        "municipios": [],
    }
