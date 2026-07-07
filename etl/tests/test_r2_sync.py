"""Unit tests for backfilling R2 uploads for already-archived local files.

``sync_archived_to_r2`` uploads local archive files that have no
``archived_url`` yet, WITHOUT re-fetching them from the origin -- used
to backfill R2 for records archived before credentials were configured
(e.g. mcr-docs/sibom, archived locally-only in an earlier run), without
re-hitting rate-limited sources.
"""

from etl.r2_sync import sync_archived_to_r2
from etl.storage import LocalArchiveStore


class FakeR2Store:
    def __init__(self) -> None:
        self.uploads: list[tuple[str, bytes, str]] = []

    def upload(self, key: str, data: bytes, content_type: str) -> str:
        self.uploads.append((key, data, content_type))
        return f"https://archive.example.org/{key}"


def _make_local_store(tmp_path, capability: str, filename: str, data: bytes) -> LocalArchiveStore:
    store = LocalArchiveStore(root=tmp_path / "archive")
    store.write(capability, filename, data)
    return store


def test_uploads_ok_record_missing_archived_url(tmp_path) -> None:
    local_store = _make_local_store(tmp_path, "mcr-docs", "a.pdf", b"%PDF-fake")
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
    r2_store = FakeR2Store()

    updated = sync_archived_to_r2(records, local_store=local_store, r2_store=r2_store)

    assert updated[0]["archived_url"] == "https://archive.example.org/mcr-docs/a.pdf"
    assert r2_store.uploads == [("mcr-docs/a.pdf", b"%PDF-fake", "application/pdf")]


def test_skips_record_that_already_has_archived_url(tmp_path) -> None:
    local_store = _make_local_store(tmp_path, "sibom", "b.pdf", b"%PDF-fake-2")
    records = [
        {
            "id": "sibom/boletin-031",
            "capability": "sibom",
            "status": "ok",
            "archived_path": "archive/sibom/b.pdf",
            "archived_url": "https://already.example.org/sibom/b.pdf",
            "mime": "application/pdf",
        }
    ]
    r2_store = FakeR2Store()

    updated = sync_archived_to_r2(records, local_store=local_store, r2_store=r2_store)

    assert updated[0]["archived_url"] == "https://already.example.org/sibom/b.pdf"
    assert r2_store.uploads == []


def test_skips_error_records() -> None:
    records = [
        {
            "id": "mcr-docs/missing",
            "capability": "mcr-docs",
            "status": "error",
            "archived_path": None,
            "archived_url": None,
        }
    ]
    r2_store = FakeR2Store()
    local_store = LocalArchiveStore(root="unused")

    updated = sync_archived_to_r2(records, local_store=local_store, r2_store=r2_store)

    assert updated == records
    assert r2_store.uploads == []


def test_skips_ok_record_whose_local_file_is_missing_from_disk(tmp_path) -> None:
    local_store = LocalArchiveStore(root=tmp_path / "archive")
    records = [
        {
            "id": "mcr-docs/gone",
            "capability": "mcr-docs",
            "status": "ok",
            "archived_path": "archive/mcr-docs/gone.pdf",
            "archived_url": None,
            "mime": "application/pdf",
        }
    ]
    r2_store = FakeR2Store()

    updated = sync_archived_to_r2(records, local_store=local_store, r2_store=r2_store)

    assert updated[0]["archived_url"] is None
    assert r2_store.uploads == []


def test_leaves_other_records_untouched(tmp_path) -> None:
    local_store = _make_local_store(tmp_path, "mcr-docs", "a.pdf", b"data")
    other = {
        "id": "ipc/nivel-general-nacional",
        "capability": "ipc",
        "status": "ok",
        "archived_path": "archive/ipc/x.json",
        "archived_url": "https://already.example.org/ipc/x.json",
        "mime": "application/json",
    }
    target = {
        "id": "mcr-docs/a",
        "capability": "mcr-docs",
        "status": "ok",
        "archived_path": "archive/mcr-docs/a.pdf",
        "archived_url": None,
        "mime": "application/pdf",
    }
    r2_store = FakeR2Store()

    updated = sync_archived_to_r2([other, target], local_store=local_store, r2_store=r2_store)

    assert updated[0] == other
    assert updated[1]["archived_url"] == "https://archive.example.org/mcr-docs/a.pdf"
