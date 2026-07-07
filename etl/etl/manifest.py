"""Provenance manifest (``archive-manifest.json``) read/write helpers.

Schema (see design D4), extended with a ``status`` field to record fetch
failures per the raw-data-archive spec's "Source returns 404" scenario::

    {
      "id": str,               # stable slug, referenced by sourceRefs
      "capability": str,       # coparticipacion-viewer | htc-fallos | ipc
                                # | electoral | sibom | mcr-docs
      "source": str,           # host label
      "source_url": str,
      "archived_url": str | None,   # canonical public URL (R2), None while
                                     # an R2 upload is still pending
      "archived_path": str | None,  # local mirror path (see D3)
      "sha256": str | None,         # None only when status == "error"
      "mime": str,
      "bytes": int | None,
      "fetched_at": str,       # ISO-8601 UTC
      "status": "ok" | "error",
      "notes": str,
    }

Content-drift handling (raw-data-archive spec, "Source content drifted"
scenario): when ``upsert_record`` receives a record whose ``sha256``
differs from the existing "ok" record sharing the same ``id``, the prior
version is kept under a dated id (``{id}@{fetched_at date}``) so it
remains retrievable, and the canonical id is updated to the new capture.

Failed re-fetch handling (raw-data-archive spec, "Source returns 404"
scenario): when ``upsert_record`` receives a ``status: "error"`` record
(``sha256`` is always ``None`` for these -- see ``archive.py``'s
``_empty_record``) for an ``id`` whose existing record is ``status:
"ok"``, the existing "ok" record is PRESERVED AS-IS (never overwritten
with the failed attempt's ``None`` fields). The failure is instead
recorded on the preserved record via two additive fields,
``last_error`` (the failed attempt's ``notes``) and ``last_error_at``
(the failed attempt's ``fetched_at``), so the failure is still visible
in the manifest without destroying the previously archived copy or its
``archived_url``/``archived_path``/``sha256``. If the existing record
was ALREADY ``status: "error"`` (no archived copy to protect), the
newest failure simply replaces it, same as before.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REQUIRED_FIELDS = (
    "id",
    "capability",
    "source",
    "source_url",
    "sha256",
    "mime",
    "fetched_at",
    "status",
    "notes",
)


def load_manifest(path: Path) -> list[dict[str, Any]]:
    """Load the manifest array, or an empty list if it does not exist yet."""
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def save_manifest(path: Path, records: list[dict[str, Any]]) -> None:
    """Write the manifest array as pretty-printed, UTF-8 JSON."""
    path.write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def resolve_archived_path(manifest_path: Path, record_id: str) -> Path:
    """Resolve a manifest record's ``archived_path`` to an absolute path.

    ``archived_path`` is always repo-root-relative (see ``archive.py``),
    and ``manifest_path`` always lives at the repo root
    (``archive-manifest.json``), so ``manifest_path.parent`` is the repo
    root.
    """
    records = load_manifest(manifest_path)
    record = next(r for r in records if r["id"] == record_id)
    archived_path = Path(record["archived_path"])
    if not archived_path.is_absolute():
        archived_path = manifest_path.parent / archived_path
    return archived_path


def ok_records_with_local_path(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return every ``status: "ok"`` record that declares an ``archived_path``.

    Used by the manifest-integrity acceptance test as a real invariant on
    the manifest itself (independent of whether the local ``archive/``
    tree happens to be populated on this machine): the manifest should
    never end up with zero such records, since that would mean either no
    source has ever archived successfully, or every "ok" record lost its
    local-mirror path.
    """
    return [
        record
        for record in records
        if record.get("status") == "ok" and record.get("archived_path")
    ]


def upsert_record(
    records: list[dict[str, Any]], record: dict[str, Any]
) -> list[dict[str, Any]]:
    """Insert or replace a record by ``id``, detecting content drift.

    If an existing record with the same ``id`` has status ``"ok"`` and a
    different ``sha256`` than the incoming record, the existing record is
    preserved under a dated id (so the prior version remains retrievable)
    and the incoming record is annotated as drifted.

    If the incoming record is a failed fetch (``status == "error"``) and
    the existing record is ``status == "ok"``, the existing record is
    preserved in place (see module docstring) instead of being
    overwritten with the failed attempt's empty fields.
    """
    result: list[dict[str, Any]] = []
    replaced = False
    for existing in records:
        if existing["id"] != record["id"]:
            result.append(existing)
            continue

        replaced = True

        is_failed_overwrite = (
            record.get("status") == "error" and existing.get("status") == "ok"
        )
        if is_failed_overwrite:
            preserved = dict(existing)
            preserved["last_error"] = record.get("notes") or None
            preserved["last_error_at"] = record.get("fetched_at")
            result.append(preserved)
            continue

        is_drift = (
            existing.get("status") == "ok"
            and existing.get("sha256")
            and record.get("sha256")
            and existing["sha256"] != record["sha256"]
        )
        if is_drift:
            date = (existing.get("fetched_at") or "")[:10] or "unknown"
            prior = dict(existing)
            prior["id"] = f"{existing['id']}@{date}"
            prior_note = prior.get("notes") or ""
            prior["notes"] = (
                f"{prior_note} [superseded by newer capture on "
                f"{record.get('fetched_at')}]"
            ).strip()
            result.append(prior)

            record = dict(record)
            new_note = record.get("notes") or ""
            record["notes"] = f"{new_note} [content drift detected vs prior capture]".strip()

        result.append(record)

    if not replaced:
        result.append(record)
    return result
