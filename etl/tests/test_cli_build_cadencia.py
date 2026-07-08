"""Unit tests for the `etl build-cadencia` CLI wiring (etl.cli).

Monkeypatches `build_cadencia` so this suite never reads the real project
archive/manifest -- it only proves the CLI wires args -> build_cadencia ->
JSON file on disk correctly (same pattern as test_cli_build_transparencia.py).
"""

import argparse
import json
from pathlib import Path

from etl import cli


def test_build_cadencia_writes_data_file(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"
    cadencia_curated_path = Path("cadencia.yaml")
    asap_curated_path = Path("asap_transparencia.yaml")

    def fake_build_cadencia(
        manifest_path_arg, cadencia_curated_path_arg, asap_curated_path_arg, **kwargs
    ):
        assert manifest_path_arg == manifest_path
        assert cadencia_curated_path_arg == cadencia_curated_path
        assert asap_curated_path_arg == asap_curated_path
        return {"dimensions": [], "deuda": {}, "sourceRefs": []}

    monkeypatch.setattr(cli, "build_cadencia", fake_build_cadencia)

    args = argparse.Namespace(
        manifest_path=manifest_path,
        data_root=data_root,
        cadencia_curated_path=cadencia_curated_path,
        asap_curated_path=asap_curated_path,
    )
    exit_code = cli.run_build_cadencia(args)

    assert exit_code == 0
    written = json.loads((data_root / "cadencia.json").read_text(encoding="utf-8"))
    assert written == {"dimensions": [], "deuda": {}, "sourceRefs": []}
