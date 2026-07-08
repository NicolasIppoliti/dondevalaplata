"""Unit tests for the `etl build-deuda-historica` CLI wiring (etl.cli).

Monkeypatches `build_deuda_historica` so this suite never reads the real
project archive/manifest -- same pattern as test_cli_build_cadencia.py.
"""

import argparse
import json

from etl import cli


def test_build_deuda_historica_writes_data_file(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"

    def fake_build_deuda_historica(manifest_path_arg, **kwargs):
        assert manifest_path_arg == manifest_path
        return {"generatedAt": "2026-07-08T12:00:00Z", "series": [], "sourceRefs": []}

    monkeypatch.setattr(cli, "build_deuda_historica", fake_build_deuda_historica)

    args = argparse.Namespace(manifest_path=manifest_path, data_root=data_root)
    exit_code = cli.run_build_deuda_historica(args)

    assert exit_code == 0
    written = json.loads((data_root / "deuda-historica.json").read_text(encoding="utf-8"))
    assert written == {
        "generatedAt": "2026-07-08T12:00:00Z",
        "series": [],
        "sourceRefs": [],
    }
