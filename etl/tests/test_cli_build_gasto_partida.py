"""Unit tests for the `etl build-gasto-partida` CLI wiring (etl.cli), G2.

Monkeypatches `build_gasto_partida` so this suite never reads the real
project archive/manifest -- it only proves the CLI wires args ->
build_gasto_partida -> JSON file on disk correctly.
"""

import argparse
import json

from etl import cli


def test_build_gasto_partida_writes_data_file(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"

    def fake_build_gasto_partida(manifest_path_arg, **kwargs):
        assert manifest_path_arg == manifest_path
        return {"jurisdicciones": [], "sourceRefs": [], "reconciliation": {"reconciles": True}}

    monkeypatch.setattr(cli, "build_gasto_partida", fake_build_gasto_partida)

    args = argparse.Namespace(manifest_path=manifest_path, data_root=data_root)
    exit_code = cli.run_build_gasto_partida(args)

    assert exit_code == 0
    written = json.loads((data_root / "gasto-partida.json").read_text(encoding="utf-8"))
    assert written == {
        "jurisdicciones": [],
        "sourceRefs": [],
        "reconciliation": {"reconciles": True},
    }


def test_build_gasto_partida_exits_nonzero_when_reconciliation_fails(
    tmp_path, monkeypatch
) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"

    def fake_build_gasto_partida_raises(manifest_path_arg, **kwargs):
        raise ValueError("gasto-partida reconciliation failed -- refusing to write")

    monkeypatch.setattr(cli, "build_gasto_partida", fake_build_gasto_partida_raises)

    args = argparse.Namespace(manifest_path=manifest_path, data_root=data_root)
    exit_code = cli.run_build_gasto_partida(args)

    assert exit_code == 1
    assert not (data_root / "gasto-partida.json").exists()
