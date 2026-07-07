"""Core archival pipeline: fetch -> sha256 -> manifest -> R2 upload -> repo mirror.

Per design D8, this module (plus ``sibom.py`` and ``mcr_docs.py``, which
enumerate their own listings before delegating fetches back here) is the
only place in the ETL package that performs network I/O.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

from .manifest import load_manifest, save_manifest, upsert_record
from .storage import LocalArchiveStore, sha256_of

DEFAULT_USER_AGENT = (
    "PortalTransparenciaCoronelRosales/1.0 "
    "(+https://mcr.gob.ar; archival bot for a civic transparency portal; "
    "F0 raw-data-archive)"
)

# Per-capability delay (seconds) applied between sequential fetches, to be
# polite to sources that ask for it explicitly (SIBOM: "sequential, small
# delay, proper User-Agent").
POLITENESS_DELAY_SECONDS: dict[str, float] = {
    "sibom": 0.75,
}


class Fetcher(Protocol):
    """Minimal fetch surface, swappable with a fake in tests."""

    def get(
        self, url: str, *, timeout: float, headers: dict[str, str]
    ) -> FetchResponse: ...


@dataclass
class FetchResponse:
    status_code: int
    content: bytes
    headers: dict[str, str] = field(default_factory=dict)


@dataclass
class ArchiveResult:
    record: dict


def _empty_record(entry: dict, fetched_at: str, note: str) -> dict:
    return {
        "id": entry["id"],
        "capability": entry["capability"],
        "source": entry["source"],
        "source_url": entry["source_url"],
        "archived_url": None,
        "archived_path": None,
        "sha256": None,
        "mime": entry.get("mime", "application/octet-stream"),
        "bytes": None,
        "fetched_at": fetched_at,
        "status": "error",
        "notes": note.strip(),
    }


def archive_source(
    entry: dict,
    *,
    fetcher: Fetcher,
    local_store: LocalArchiveStore,
    r2_store: object | None,
    now: datetime | None = None,
) -> ArchiveResult:
    """Fetch one source entry and produce its manifest record.

    ``entry`` matches one ``etl/sources.yaml`` item plus an injected
    ``capability`` key: ``id``, ``source``, ``source_url``, ``mime``,
    ``notes``, ``capability``, and an optional ``filename`` (defaults to
    the last path segment of ``id``).
    """
    fetched_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")
    capability = entry["capability"]
    source_url = entry["source_url"]
    notes = entry.get("notes", "")
    timeout = entry.get("timeout", 60)

    try:
        response = fetcher.get(
            source_url, timeout=timeout, headers={"User-Agent": DEFAULT_USER_AGENT}
        )
    except Exception as exc:  # network error, DNS failure, timeout, etc.
        return ArchiveResult(
            record=_empty_record(entry, fetched_at, f"{notes} [fetch failed: {exc}]")
        )

    if response.status_code >= 400:
        return ArchiveResult(
            record=_empty_record(
                entry, fetched_at, f"{notes} [HTTP {response.status_code}]"
            )
        )

    data = response.content
    digest = sha256_of(data)
    filename = entry.get("filename") or entry["id"].split("/")[-1]
    local_store.write(capability, filename, data)
    # Portable, repo-relative path (never the absolute machine path), so the
    # manifest works identically for every developer/CI checkout.
    archived_path = f"{local_store.root.name}/{capability}/{filename}"

    archived_url = None
    if r2_store is not None:
        key = f"{capability}/{filename}"
        archived_url = r2_store.upload(key, data, entry.get("mime", "application/octet-stream"))

    final_notes = notes
    if not archived_url:
        final_notes = f"{notes} [R2 upload pending: no credentials configured]".strip()

    record = {
        "id": entry["id"],
        "capability": capability,
        "source": entry["source"],
        "source_url": source_url,
        "archived_url": archived_url,
        "archived_path": archived_path,
        "sha256": digest,
        "mime": entry.get("mime", "application/octet-stream"),
        "bytes": len(data),
        "fetched_at": fetched_at,
        "status": "ok",
        "notes": final_notes,
    }
    return ArchiveResult(record=record)


def run_archive_all(
    sources: dict[str, list[dict]],
    *,
    fetcher: Fetcher,
    local_root: Path,
    manifest_path: Path,
    r2_store: object | None,
    sleep: object | None = None,
) -> list[dict]:
    """Archive every entry across every capability family, updating the manifest.

    ``sleep`` (defaults to ``time.sleep`` when ``None``) is injected so
    tests never actually pause; production callers get real politeness
    delays between sequential fetches for capabilities listed in
    ``POLITENESS_DELAY_SECONDS``.
    """
    import time

    sleep_fn = sleep or time.sleep
    local_store = LocalArchiveStore(root=local_root)
    records = load_manifest(manifest_path)
    for capability, entries in sources.items():
        delay = POLITENESS_DELAY_SECONDS.get(capability, 0)
        for index, entry in enumerate(entries):
            full_entry = {**entry, "capability": capability}
            result = archive_source(
                full_entry, fetcher=fetcher, local_store=local_store, r2_store=r2_store
            )
            records = upsert_record(records, result.record)
            if delay and index < len(entries) - 1:
                sleep_fn(delay)
    save_manifest(manifest_path, records)
    return records
