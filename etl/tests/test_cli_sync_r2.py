"""Unit tests for the `etl sync-r2` CLI wiring (etl.cli).

Monkeypatches the collaborators (`sync_archived_to_r2`, `R2Store.from_env`,
manifest load/save) so this suite never touches the network or the real
project files.
"""

import argparse
import json

from etl import cli


def test_sync_r2_prints_message_and_exits_nonzero_when_no_credentials(
    tmp_path, monkeypatch
) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    manifest_path.write_text("[]", encoding="utf-8")

    monkeypatch.setattr(cli.R2Store, "from_env", classmethod(lambda cls: None))

    args = argparse.Namespace(
        manifest_path=manifest_path, archive_root=tmp_path / "archive"
    )
    exit_code = cli.run_sync_r2(args)

    assert exit_code == 1


def test_sync_r2_uploads_and_saves_manifest_when_configured(tmp_path, monkeypatch) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    records = [
        {
            "id": "mcr-docs/a",
            "capability": "mcr-docs",
            "status": "ok",
            "archived_path": "archive/mcr-docs/a.pdf",
            "archived_url": None,
            "mime": "application/pdf",
        }
    ]
    manifest_path.write_text(json.dumps(records), encoding="utf-8")

    class FakeR2Store:
        def upload(self, key, data, content_type):
            return f"https://archive.example.org/{key}"

    monkeypatch.setattr(cli.R2Store, "from_env", classmethod(lambda cls: FakeR2Store()))

    def fake_sync(recs, *, local_store, r2_store):
        assert recs == records
        return [{**recs[0], "archived_url": "https://archive.example.org/mcr-docs/a.pdf"}]

    monkeypatch.setattr(cli, "sync_archived_to_r2", fake_sync)

    args = argparse.Namespace(
        manifest_path=manifest_path, archive_root=tmp_path / "archive"
    )
    exit_code = cli.run_sync_r2(args)

    assert exit_code == 0
    saved = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert saved[0]["archived_url"] == "https://archive.example.org/mcr-docs/a.pdf"
