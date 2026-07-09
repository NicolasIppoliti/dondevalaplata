"""Unit tests for the `etl build-titularidad` CLI wiring (etl.cli).

Monkeypatches `build_titularidad` so this suite never reads the real
project curated file -- it only proves the CLI wires
args -> build_titularidad -> JSON file on disk correctly.
"""

import argparse
import json
from pathlib import Path

from etl import cli


def test_build_titularidad_writes_data_file(tmp_path, monkeypatch) -> None:
    data_root = tmp_path / "data"
    curated_path = Path("titularidad.yaml")

    def fake_build_titularidad(curated_path_arg, **kwargs):
        assert curated_path_arg == curated_path
        return {"generatedAt": "2026-07-09T00:00:00Z", "sourceRefs": [], "records": []}

    monkeypatch.setattr(cli, "build_titularidad", fake_build_titularidad)

    args = argparse.Namespace(data_root=data_root, titularidad_curated_path=curated_path)
    exit_code = cli.run_build_titularidad(args)

    assert exit_code == 0
    written = json.loads((data_root / "titularidad.json").read_text(encoding="utf-8"))
    assert written == {"generatedAt": "2026-07-09T00:00:00Z", "sourceRefs": [], "records": []}


def test_build_titularidad_parser_wires_default_curated_path() -> None:
    parser = cli.build_parser()
    args = parser.parse_args(["build-titularidad"])

    assert args.titularidad_curated_path == cli.DEFAULT_TITULARIDAD_CURATED_PATH
    assert args.func is cli.run_build_titularidad
