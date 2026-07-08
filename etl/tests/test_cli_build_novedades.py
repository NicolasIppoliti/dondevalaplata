"""Unit tests for the `etl build-novedades` CLI wiring (etl.cli).

Monkeypatches `build_novedades` so this suite never reads the real project
archive/manifest -- same pattern as test_cli_build_cadencia.py.
"""

import argparse
import json

from etl import cli


def test_build_novedades_writes_data_file(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"
    data_root.mkdir()
    cadencia_path = data_root / "cadencia.json"
    seed_path = tmp_path / "novedades_seed.yaml"

    captured: dict = {}

    def fake_build_novedades(
        manifest_path_arg, cadencia_path_arg, seed_path_arg, **kwargs
    ):
        captured["manifest_path"] = manifest_path_arg
        captured["cadencia_path"] = cadencia_path_arg
        captured["seed_path"] = seed_path_arg
        captured["previous_novedades"] = kwargs.get("previous_novedades")
        return {"generatedAt": "2026-07-08T12:00:00Z", "events": [], "sourceRefs": []}

    monkeypatch.setattr(cli, "build_novedades", fake_build_novedades)

    args = argparse.Namespace(
        manifest_path=manifest_path,
        data_root=data_root,
        cadencia_path=cadencia_path,
        novedades_seed_path=seed_path,
    )
    exit_code = cli.run_build_novedades(args)

    assert exit_code == 0
    assert captured["manifest_path"] == manifest_path
    assert captured["cadencia_path"] == cadencia_path
    assert captured["seed_path"] == seed_path
    # No pre-existing data/novedades.json on this fresh tmp_path -> None.
    assert captured["previous_novedades"] is None

    written = json.loads((data_root / "novedades.json").read_text(encoding="utf-8"))
    assert written == {"generatedAt": "2026-07-08T12:00:00Z", "events": [], "sourceRefs": []}


def test_build_novedades_passes_previous_novedades_when_file_exists(
    tmp_path, monkeypatch
) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    data_root = tmp_path / "data"
    data_root.mkdir()
    cadencia_path = data_root / "cadencia.json"
    seed_path = tmp_path / "novedades_seed.yaml"

    existing = {
        "generatedAt": "2026-06-01T00:00:00Z",
        "events": [{"id": "auto-published-x", "kind": "auto-detected"}],
        "sourceRefs": [],
    }
    (data_root / "novedades.json").write_text(json.dumps(existing), encoding="utf-8")

    captured: dict = {}

    def fake_build_novedades(
        manifest_path_arg, cadencia_path_arg, seed_path_arg, **kwargs
    ):
        captured["previous_novedades"] = kwargs.get("previous_novedades")
        return {"generatedAt": "2026-07-08T12:00:00Z", "events": [], "sourceRefs": []}

    monkeypatch.setattr(cli, "build_novedades", fake_build_novedades)

    args = argparse.Namespace(
        manifest_path=manifest_path,
        data_root=data_root,
        cadencia_path=cadencia_path,
        novedades_seed_path=seed_path,
    )
    cli.run_build_novedades(args)

    assert captured["previous_novedades"] == existing
