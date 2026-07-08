"""Unit tests for the `etl archive` CLI wiring (etl.cli).

Monkeypatches the collaborators (`run_archive_all`, dynamic discovery,
R2Store.from_env) so this suite never touches the network or the real
project files.
"""

import argparse

from etl import cli
from etl.archive import FetchResponse


class FakeHeadFetcher:
    """Only implements `head` -- proves the dry-run path never downloads bodies."""

    def __init__(self, status_code: int = 200) -> None:
        self.status_code = status_code
        self.head_calls: list[str] = []

    def head(self, url: str, *, timeout: float, headers: dict[str, str]) -> FetchResponse:
        self.head_calls.append(url)
        return FetchResponse(self.status_code, b"")

    def get(self, url: str, *, timeout: float, headers: dict[str, str]) -> FetchResponse:
        raise AssertionError("dry-run reachability must use head(), not get()")


def test_run_archive_dry_run_does_not_write_manifest(tmp_path, monkeypatch) -> None:
    sources_path = tmp_path / "sources.yaml"
    sources_path.write_text("coparticipacion-viewer: []\n", encoding="utf-8")
    manifest_path = tmp_path / "archive-manifest.json"

    called = {"run_archive_all": False}

    def fake_run_archive_all(*args, **kwargs):
        called["run_archive_all"] = True
        return []

    monkeypatch.setattr(cli, "run_archive_all", fake_run_archive_all)
    monkeypatch.setattr(cli, "discover_dynamic_sources", lambda fetcher, **kwargs: {})

    args = argparse.Namespace(
        dry_run=True,
        sources_path=sources_path,
        manifest_path=manifest_path,
        archive_root=tmp_path / "archive",
        capabilities=None,
    )
    exit_code = cli.run_archive(args)

    assert exit_code == 0
    assert called["run_archive_all"] is False
    assert not manifest_path.exists()


def test_run_archive_calls_run_archive_all_when_not_dry_run(tmp_path, monkeypatch) -> None:
    sources_path = tmp_path / "sources.yaml"
    sources_path.write_text("coparticipacion-viewer: []\n", encoding="utf-8")
    manifest_path = tmp_path / "archive-manifest.json"

    captured = {}

    def fake_run_archive_all(sources, *, fetcher, local_root, manifest_path, r2_store):
        captured["sources"] = sources
        captured["local_root"] = local_root
        captured["manifest_path"] = manifest_path
        return [{"id": "x", "status": "ok"}]

    monkeypatch.setattr(cli, "run_archive_all", fake_run_archive_all)
    monkeypatch.setattr(cli, "discover_dynamic_sources", lambda fetcher, **kwargs: {})

    args = argparse.Namespace(
        dry_run=False,
        sources_path=sources_path,
        manifest_path=manifest_path,
        archive_root=tmp_path / "archive",
        capabilities=None,
    )
    exit_code = cli.run_archive(args)

    assert exit_code == 0
    assert captured["manifest_path"] == manifest_path
    assert captured["local_root"] == tmp_path / "archive"


def test_run_archive_scopes_to_requested_capabilities_only(tmp_path, monkeypatch) -> None:
    sources_path = tmp_path / "sources.yaml"
    sources_path.write_text(
        "coparticipacion-viewer:\n  - id: a\nhtc-fallos:\n  - id: b\n", encoding="utf-8"
    )
    manifest_path = tmp_path / "archive-manifest.json"

    captured = {}

    def fake_run_archive_all(sources, *, fetcher, local_root, manifest_path, r2_store):
        captured["sources"] = sources
        return []

    monkeypatch.setattr(cli, "run_archive_all", fake_run_archive_all)
    monkeypatch.setattr(cli, "discover_dynamic_sources", lambda fetcher, **kwargs: {})

    args = argparse.Namespace(
        dry_run=False,
        sources_path=sources_path,
        manifest_path=manifest_path,
        archive_root=tmp_path / "archive",
        capabilities=["htc-fallos"],
    )
    cli.run_archive(args)

    assert list(captured["sources"]) == ["htc-fallos"]


def test_reachability_report_uses_head_not_get_for_static_capabilities() -> None:
    sources = {
        "coparticipacion-viewer": [
            {"id": "coparticipacion/x", "source_url": "https://example.org/x.csv"}
        ],
    }
    fetcher = FakeHeadFetcher(status_code=200)

    lines = cli._reachability_report(sources, fetcher)

    assert fetcher.head_calls == ["https://example.org/x.csv"]
    assert lines == ["[coparticipacion-viewer] coparticipacion/x: OK"]


def test_reachability_report_summarizes_bulk_families_without_per_item_head() -> None:
    sources = {
        "sibom": [
            {"id": f"sibom/boletin-{i:03d}", "source_url": "https://x/y.pdf"}
            for i in range(3)
        ],
        "mcr-docs": [{"id": "mcr-docs/a", "source_url": "https://x/a.pdf"}],
    }
    fetcher = FakeHeadFetcher(status_code=200)

    lines = cli._reachability_report(sources, fetcher)

    assert fetcher.head_calls == []  # no per-item HEAD for bulk/dynamic families
    assert lines == [
        "[sibom] 3 entries discovered (reachability proven by the listing fetch itself)",
        "[mcr-docs] 1 entries discovered (reachability proven by the listing fetch itself)",
    ]


def test_reachability_report_reports_error_without_raising() -> None:
    class RaisingFetcher:
        def head(self, url: str, *, timeout: float, headers: dict[str, str]):
            raise TimeoutError("slow host")

    sources = {"electoral": [{"id": "electoral/x", "source_url": "https://x/y.zip"}]}
    lines = cli._reachability_report(sources, RaisingFetcher())

    assert lines == ["[electoral] electoral/x: ERROR: slow host"]
