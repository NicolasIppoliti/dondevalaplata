"""Unit tests for the `etl build-fallos` CLI wiring (etl.cli), task 3.10.

Monkeypatches `build_fallos` so this suite never reads the real project
archive/manifest -- it only proves the CLI wires args -> build_fallos ->
JSON file on disk correctly.
"""

import argparse
import json
from pathlib import Path

from etl import cli


def test_build_fallos_writes_data_file(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"
    ficha_2022_path = Path("fallos_ficha_2022.yaml")

    def fake_build_fallos(manifest_path_arg, ficha_2022_path_arg, **kwargs):
        assert manifest_path_arg == manifest_path
        assert ficha_2022_path_arg == ficha_2022_path
        return {"records": [], "sourceRefs": []}

    monkeypatch.setattr(cli, "build_fallos", fake_build_fallos)

    args = argparse.Namespace(
        manifest_path=manifest_path, data_root=data_root, ficha_2022_path=ficha_2022_path
    )
    exit_code = cli.run_build_fallos(args)

    assert exit_code == 0
    written = json.loads((data_root / "fallos.json").read_text(encoding="utf-8"))
    assert written == {"records": [], "sourceRefs": []}
