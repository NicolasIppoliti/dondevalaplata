"""Unit tests for the provenance manifest helpers (etl.manifest).

Schema per design D4 (extended with a ``status`` field to record fetch
failures, per the raw-data-archive spec's "Source returns 404" scenario).
"""

import json

from etl.manifest import (
    REQUIRED_FIELDS,
    load_manifest,
    ok_records_with_local_path,
    save_manifest,
    upsert_record,
)


def _record(**overrides: object) -> dict:
    base = {
        "id": "coparticipacion/transferencias-municipios",
        "capability": "coparticipacion-viewer",
        "source": "catalogo.datos.gba.gob.ar",
        "source_url": "https://catalogo.datos.gba.gob.ar/dataset/x/download/file.csv",
        "archived_url": "https://archive.example.r2.dev/coparticipacion/file.csv",
        "archived_path": "archive/coparticipacion/file.csv",
        "sha256": "a" * 64,
        "mime": "text/csv",
        "bytes": 123,
        "fetched_at": "2026-07-06T20:00:00Z",
        "status": "ok",
        "notes": "",
    }
    base.update(overrides)
    return base


def test_load_manifest_returns_empty_list_when_missing(tmp_path) -> None:
    assert load_manifest(tmp_path / "archive-manifest.json") == []


def test_save_then_load_roundtrips(tmp_path) -> None:
    path = tmp_path / "archive-manifest.json"
    save_manifest(path, [_record()])

    loaded = load_manifest(path)
    assert loaded == [_record()]
    # Human-readable, stable formatting (indent + trailing newline)
    assert path.read_text(encoding="utf-8").endswith("]\n")


def test_required_fields_present_in_fixture_record() -> None:
    record = _record()
    for field in REQUIRED_FIELDS:
        assert field in record


def test_upsert_inserts_new_record() -> None:
    result = upsert_record([], _record())
    assert len(result) == 1
    assert result[0]["id"] == "coparticipacion/transferencias-municipios"


def test_upsert_replaces_record_with_same_id_and_same_hash() -> None:
    existing = [_record(notes="first fetch")]
    updated = upsert_record(existing, _record(notes="second fetch, same content"))

    assert len(updated) == 1
    assert updated[0]["notes"] == "second fetch, same content"


def test_upsert_detects_content_drift_and_keeps_prior_version() -> None:
    existing = [_record(fetched_at="2026-06-01T00:00:00Z", sha256="a" * 64)]
    drifted = _record(fetched_at="2026-07-06T00:00:00Z", sha256="b" * 64)

    updated = upsert_record(existing, drifted)

    ids = {r["id"] for r in updated}
    assert "coparticipacion/transferencias-municipios" in ids
    assert "coparticipacion/transferencias-municipios@2026-06-01" in ids

    canonical = next(
        r for r in updated if r["id"] == "coparticipacion/transferencias-municipios"
    )
    assert canonical["sha256"] == "b" * 64
    assert "drift" in canonical["notes"].lower()

    prior = next(
        r
        for r in updated
        if r["id"] == "coparticipacion/transferencias-municipios@2026-06-01"
    )
    assert prior["sha256"] == "a" * 64
    assert "superseded" in prior["notes"].lower()


def test_upsert_does_not_flag_drift_when_prior_status_was_error() -> None:
    existing = [_record(status="error", sha256=None)]
    fresh = _record(status="ok", sha256="c" * 64)

    updated = upsert_record(existing, fresh)

    assert len(updated) == 1
    assert updated[0]["status"] == "ok"


def test_upsert_preserves_prior_ok_record_when_incoming_fetch_fails() -> None:
    """Reproduces the verifier's exact C1 finding: a failed re-fetch (HTTP
    429/404, sha256=None) must NEVER destroy a previously archived copy --
    per raw-data-archive's "Source returns 404" scenario ("records the
    failure in the manifest without deleting the existing archived copy").
    """
    existing = [
        _record(
            status="ok",
            sha256="a" * 64,
            archived_url="https://pub.example.r2.dev/coparticipacion/file.csv",
            archived_path="archive/coparticipacion/file.csv",
        )
    ]
    failed_attempt = _record(
        status="error",
        sha256=None,
        archived_url=None,
        archived_path=None,
        fetched_at="2026-07-07T00:00:00Z",
        notes="[HTTP 429]",
    )

    updated = upsert_record(existing, failed_attempt)

    assert len(updated) == 1
    preserved = updated[0]
    # The prior good record must survive intact -- this is the exact field
    # set that a naive overwrite (the pre-fix behavior) destroyed.
    assert preserved["status"] == "ok"
    assert preserved["sha256"] == "a" * 64
    assert preserved["archived_url"] == "https://pub.example.r2.dev/coparticipacion/file.csv"
    assert preserved["archived_path"] == "archive/coparticipacion/file.csv"
    # The failed attempt must still be recorded, not silently dropped.
    assert preserved.get("last_error")
    assert "429" in preserved["last_error"]
    assert preserved.get("last_error_at") == "2026-07-07T00:00:00Z"


def test_upsert_still_overwrites_when_prior_status_was_already_error() -> None:
    """No archived copy exists to protect when the prior attempt also
    failed -- the newest failure record should simply replace it."""
    existing = [_record(status="error", sha256=None, archived_url=None, notes="[HTTP 429]")]
    fresh_failure = _record(
        status="error", sha256=None, archived_url=None, notes="[HTTP 500]"
    )

    updated = upsert_record(existing, fresh_failure)

    assert len(updated) == 1
    assert updated[0]["notes"] == "[HTTP 500]"


def test_ok_records_with_local_path_returns_matching_records() -> None:
    records = [
        _record(id="a", status="ok", archived_path="archive/a.csv"),
        _record(id="b", status="ok", archived_path=None),
        _record(id="c", status="error", archived_path=None),
    ]
    result = ok_records_with_local_path(records)
    assert [r["id"] for r in result] == ["a"]


def test_ok_records_with_local_path_returns_empty_when_none_qualify() -> None:
    records = [
        _record(id="b", status="ok", archived_path=None),
        _record(id="c", status="error", archived_path="archive/c.pdf"),
    ]
    assert ok_records_with_local_path(records) == []


def test_manifest_is_valid_json_array(tmp_path) -> None:
    path = tmp_path / "archive-manifest.json"
    save_manifest(path, [_record(), _record(id="other/id")])

    parsed = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(parsed, list)
    assert len(parsed) == 2
