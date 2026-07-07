"""Unit tests for the `etl build-transparencia` CLI wiring (etl.cli).

Monkeypatches `build_transparencia` so this suite never reads the real
curated YAML -- it only proves the CLI wires args -> build_transparencia
-> JSON file on disk correctly (same pattern as
test_cli_build_fallos.py).
"""

import argparse
import json
from pathlib import Path

from etl import cli


def test_build_transparencia_writes_data_file(tmp_path, monkeypatch) -> None:
    curated_path = Path("asap_transparencia.yaml")
    data_root = tmp_path / "data"

    def fake_build_transparencia(curated_path_arg, **kwargs):
        assert curated_path_arg == curated_path
        return {
            "total": 81,
            "max": 100,
            "dimensions": [],
            "trend": [],
            "sourceRefs": [],
        }

    monkeypatch.setattr(cli, "build_transparencia", fake_build_transparencia)

    args = argparse.Namespace(curated_path=curated_path, data_root=data_root)
    exit_code = cli.run_build_transparencia(args)

    assert exit_code == 0
    written = json.loads((data_root / "transparencia.json").read_text(encoding="utf-8"))
    assert written["total"] == 81
