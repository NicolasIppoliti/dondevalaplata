"""Unit tests for the `etl build-ipc` CLI wiring (etl.cli), task 3.3.

Monkeypatches `build_ipc` so this suite never reads the real project
archive/manifest -- it only proves the CLI wires args -> build_ipc ->
JSON file on disk correctly.
"""

import argparse
import json

from etl import cli


def test_build_ipc_writes_data_file(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"

    def fake_build_ipc(manifest_path_arg, **kwargs):
        assert manifest_path_arg == manifest_path
        return {"seriesId": "test-series", "baseMonth": "2024-02", "points": []}

    monkeypatch.setattr(cli, "build_ipc", fake_build_ipc)

    args = argparse.Namespace(manifest_path=manifest_path, data_root=data_root)
    exit_code = cli.run_build_ipc(args)

    assert exit_code == 0
    output_path = data_root / "ipc" / "ipc-nacional.json"
    written = json.loads(output_path.read_text(encoding="utf-8"))
    assert written["seriesId"] == "test-series"
