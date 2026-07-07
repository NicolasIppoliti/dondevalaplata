"""Unit tests for the `etl build-coparticipacion` CLI wiring (etl.cli), tasks 3.5-3.7.

Monkeypatches `build_coparticipacion` so this suite never reads the real
project archive/manifest -- it only proves the CLI wires
manifest lookup -> CSV path -> ipc-nacional.json -> build_coparticipacion
-> JSON file on disk correctly.
"""

import argparse
import json

from etl import cli


def test_build_coparticipacion_writes_data_file(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": "coparticipacion/transferencias-municipios",
                    "capability": "coparticipacion-viewer",
                    "archived_path": "archive/coparticipacion-viewer/transferencias.csv",
                    "status": "ok",
                }
            ]
        ),
        encoding="utf-8",
    )
    data_root = tmp_path / "data"
    (data_root / "ipc").mkdir(parents=True)
    (data_root / "ipc" / "ipc-nacional.json").write_text(
        json.dumps(
            {
                "seriesId": "test-series",
                "baseMonth": "2024-01",
                "dataThrough": "2024-01",
                "points": [{"period": "2024-01", "index": 100.0, "factor": 1.0}],
            }
        ),
        encoding="utf-8",
    )

    captured = {}

    def fake_build_coparticipacion(csv_path, ipc, **kwargs):
        captured["csv_path"] = csv_path
        captured["ipc_series_id"] = ipc.series_id
        return {"series": [], "dataThrough": "2024-01"}

    monkeypatch.setattr(cli, "build_coparticipacion", fake_build_coparticipacion)

    args = argparse.Namespace(manifest_path=manifest_path, data_root=data_root)
    exit_code = cli.run_build_coparticipacion(args)

    assert exit_code == 0
    expected_csv_path = (
        manifest_path.parent / "archive/coparticipacion-viewer/transferencias.csv"
    )
    assert captured["csv_path"] == expected_csv_path
    assert captured["ipc_series_id"] == "test-series"
    written = json.loads((data_root / "coparticipacion.json").read_text(encoding="utf-8"))
    assert written["dataThrough"] == "2024-01"
