"""Backfill Cloudflare R2 uploads for already-archived local files.

Unlike ``archive_source`` (which fetches from the origin AND uploads to
R2 in one pass), ``sync_archived_to_r2`` uploads files that are already
present in the local archive (``archive/<capability>/<filename>``)
without re-fetching them -- used to backfill R2 for records archived in
a prior run before R2 credentials were configured (e.g. mcr-docs/sibom
in this project), without re-hitting rate-limited or slow origins.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .storage import LocalArchiveStore


class R2Uploader:
    """Minimal upload surface, matching ``r2.R2Store`` (fakeable in tests)."""

    def upload(self, key: str, data: bytes, content_type: str) -> str: ...  # noqa: D102


def sync_archived_to_r2(
    records: list[dict[str, Any]],
    *,
    local_store: LocalArchiveStore,
    r2_store: R2Uploader,
) -> list[dict[str, Any]]:
    """Return an updated copy of ``records`` with ``archived_url`` backfilled.

    Only records with ``status == "ok"``, a missing ``archived_url``, and a
    local file that actually exists on disk are uploaded. Records that
    already have an ``archived_url``, error records, and ok records whose
    local file is missing (e.g. fresh clone without the archive/ tree) are
    left untouched. Does not persist the manifest -- the caller decides
    when to save.
    """
    updated: list[dict[str, Any]] = []
    for record in records:
        if record.get("status") != "ok" or record.get("archived_url"):
            updated.append(record)
            continue

        archived_path = record.get("archived_path")
        capability = record.get("capability")
        if not archived_path or not capability:
            updated.append(record)
            continue

        filename = Path(archived_path).name
        if not local_store.exists(capability, filename):
            updated.append(record)
            continue

        data = local_store.read(capability, filename)
        key = f"{capability}/{filename}"
        url = r2_store.upload(key, data, record.get("mime", "application/octet-stream"))
        updated.append({**record, "archived_url": url})

    return updated
