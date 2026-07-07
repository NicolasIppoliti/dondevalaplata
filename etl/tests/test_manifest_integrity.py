"""Manifest-integrity acceptance test (Slice 2 task 2.10).

Validates the REAL, committed `archive-manifest.json` at the repo root
after `etl archive` has populated it: required fields present for every
record, well-formed URLs, and SHA-256 recompute for every locally
mirrored file. Because raw archive blobs are gitignored (see design D3
and root `.gitignore`), the sha256 recompute is best-effort: it only runs
for records whose `archived_path` file is actually present on disk (e.g.
right after running `etl archive` locally), and is skipped -- not
failed -- on a fresh clone that never ran the archival pipeline.
"""

import json
from pathlib import Path

from etl.manifest import REQUIRED_FIELDS, ok_records_with_local_path
from etl.storage import sha256_of

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MANIFEST_PATH = REPO_ROOT / "archive-manifest.json"


def _load_manifest() -> list[dict]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def test_manifest_file_is_valid_json_array() -> None:
    records = _load_manifest()
    assert isinstance(records, list)


def test_every_record_has_required_fields() -> None:
    records = _load_manifest()
    for record in records:
        for field in REQUIRED_FIELDS:
            assert field in record, f"{record.get('id')} missing field {field!r}"


def test_every_record_has_a_unique_id() -> None:
    records = _load_manifest()
    ids = [r["id"] for r in records]
    assert len(ids) == len(set(ids)), "duplicate ids in archive-manifest.json"


def test_ok_records_have_source_url_and_sha256() -> None:
    records = _load_manifest()
    for record in records:
        if record["status"] != "ok":
            continue
        assert record["source_url"].startswith("http")
        assert record["sha256"] is not None
        assert len(record["sha256"]) == 64


def test_error_records_have_no_sha256() -> None:
    records = _load_manifest()
    for record in records:
        if record["status"] == "error":
            assert record["sha256"] is None


def test_archived_url_is_a_well_formed_url_when_present() -> None:
    records = _load_manifest()
    for record in records:
        if record["archived_url"]:
            assert record["archived_url"].startswith("http")


def test_sha256_recomputes_for_locally_present_files() -> None:
    """Best-effort: only checks files that exist locally (archive/ is gitignored)."""
    records = _load_manifest()
    checked = 0
    for record in records:
        if record["status"] != "ok" or not record.get("archived_path"):
            continue
        local_path = Path(record["archived_path"])
        if not local_path.is_absolute():
            local_path = REPO_ROOT / local_path
        if not local_path.exists():
            continue  # not present locally (fresh clone) -- skip, don't fail
        checked += 1
        assert sha256_of(local_path.read_bytes()) == record["sha256"], record["id"]
    # Not asserting checked > 0 here: a fresh clone with no local archive/
    # is valid and this loop legitimately checks nothing in that case.
    #
    # But the manifest itself must still make a real, testable claim
    # regardless of local disk state: at least one "ok" record must
    # declare an archived_path (see ok_records_with_local_path -- unit
    # tested in test_manifest.py). The prior `assert checked >= 0` was
    # always true (a non-negative counter can never be negative) and
    # caught nothing, ever, in any environment.
    assert len(ok_records_with_local_path(records)) > 0
