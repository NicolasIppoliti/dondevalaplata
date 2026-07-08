"""Watchdog "novedades" feed (feature H2b): a neutral, factual publication-
behavior log for mcr.gob.ar's "documentos" (Gobierno Abierto) listing --
`data/novedades.json`. Reads as "what did the municipality publish, when,
and what remains unpublished past the ASAP/Ordenanza 3638 expectations" --
never an accusation, always a documented, sourced fact.

Every event carries an explicit `kind`, so the UI can always label which
events are hand-curated vs. computed, per the task's HONESTY requirement:

- ``"seeded"``: hand-curated, human-verified historical facts (see
  `etl/novedades_seed.yaml`). Static -- re-running the build never changes
  a seeded event's own fields, only whether it is still present (a human
  retires one by editing the seed file). This is the bootstrap set for the
  first run of this watchdog, before any two archived snapshots exist to
  diff against each other.
- ``"auto-detected"``: a NEW document (a `mcr-docs-snapshot/documentos`
  slug not present in the immediately preceding archived snapshot)
  discovered by diffing two ARCHIVED wp-json listing snapshots (see
  `manifest.py`'s content-drift dated-id convention -- a monthly re-archive
  that changes content keeps the PRIOR capture under `{id}@{date}`, which
  is exactly what `_previous_documentos_snapshot` reads). On the very first
  run (only one snapshot ever archived), there is nothing to diff against
  yet, so this list is legitimately empty -- never fabricated.
  APPEND-ONLY across builds: once detected, a publish event stays in the
  log forever (it is a historical fact), which is why `build_novedades`
  reads the PREVIOUS `data/novedades.json` and carries its `auto-detected`
  events forward.
- ``"auto-stale"``: a LIVE, re-derived-every-build status fact ("sigue sin
  actualizar X, N días/meses") read straight from the ALREADY-BUILT
  `data/cadencia.json` (feature G1) -- never recomputed independently, same
  "reuse, don't duplicate" doctrine as `lib/presupuestoEjecucion.ts` (H1)
  reusing G2's tree. REPLACED wholesale every build (never accumulates
  duplicate "still stale" rows for the same ongoing gap): each row's `id`
  is keyed by the dimension, so it stays a single, always-current row.

This is the recurring-content engine the monthly cron feeds: each run,
`build_novedades` reloads the seeded rows fresh, re-derives the auto-stale
rows fresh from cadencia.json's latest numbers, looks for anything newly
published since the last archived snapshot, and carries forward every
previously-detected `auto-detected` event so the log only ever grows.
"""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

from .manifest import load_manifest

NOVEDADES_KIND_SEEDED = "seeded"
NOVEDADES_KIND_AUTO_DETECTED = "auto-detected"
NOVEDADES_KIND_AUTO_STALE = "auto-stale"

DOCUMENTOS_SNAPSHOT_MANIFEST_ID = "mcr-docs-snapshot/documentos"


def load_seed_events(path: Path) -> list[dict[str, Any]]:
    """Load the hand-curated seed events (see module docstring). Every
    event becomes `kind: "seeded"` -- never blended with computed kinds."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    events = []
    for entry in raw.get("events") or []:
        events.append(
            {
                "id": entry["id"],
                "kind": NOVEDADES_KIND_SEEDED,
                "date": entry["date"],
                "title": entry["title"],
                "detail": entry.get("detail") or None,
                "sourceRefs": list(entry.get("source_refs") or []),
            }
        )
    return events


def diff_new_documentos(
    previous: list[dict[str, Any]] | None,
    current: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Documentos present in `current` but not `previous` (matched by
    slug) -- brand-new publications since the last archived snapshot.

    `previous=None` (no prior snapshot exists yet) always yields an empty
    list: there is nothing to compare against, so this NEVER fabricates a
    "new" event for a document that may already have existed for months.
    """
    if previous is None:
        return []
    previous_slugs = {doc["slug"] for doc in previous}
    new_docs = [doc for doc in current if doc["slug"] not in previous_slugs]

    events = []
    for doc in sorted(new_docs, key=lambda d: d["date"]):
        events.append(
            {
                "id": f"auto-published-{doc['slug']}",
                "kind": NOVEDADES_KIND_AUTO_DETECTED,
                "date": doc["date"][:10],
                "title": f"El municipio publicó “{doc['title']['rendered']}”",
                "detail": None,
                "sourceRefs": [f"mcr-docs/{doc['slug']}"],
            }
        )
    return events


def _slugify(name: str) -> str:
    decomposed = unicodedata.normalize("NFD", name.lower())
    ascii_only = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", ascii_only).strip("-")


def derive_stale_events(cadencia: dict[str, Any]) -> list[dict[str, Any]]:
    """Re-derive the "sigue sin actualizar" rows fresh from the ALREADY-
    BUILT `data/cadencia.json` (see module docstring) -- one row per ASAP
    dimension still carrying an open gap (`got < max` and a real
    `lagMonths`), plus a dedicated, more granular deuda row (days, not just
    months) sourced from `cadencia["deuda"]`.
    """
    events = []

    deuda = cadencia.get("deuda") or {}
    deuda_source_refs = set(deuda.get("sourceRefs") or [])
    if deuda.get("quartersMissing", 0) > 0:
        events.append(
            {
                "id": "auto-stale-deuda",
                "kind": NOVEDADES_KIND_AUTO_STALE,
                "date": deuda["lastPeriodEnd"],
                "title": (
                    "Sigue sin actualizar el Stock de deuda pública y "
                    f"perfil de vencimientos ({deuda['elapsedDays']} días "
                    f"/ {deuda['quartersMissing']} trimestres sin publicar)"
                ),
                "detail": (
                    f"Último dato publicado: {deuda['lastPeriod']} (cierre "
                    f"{deuda['lastPeriodEnd']}), por {deuda['lastFigureLabel']}."
                ),
                "sourceRefs": list(deuda_source_refs),
            }
        )

    for dimension in cadencia.get("dimensions") or []:
        if dimension.get("lagMonths") is None:
            continue
        if dimension["got"] >= dimension["max"]:
            continue
        # Skip a dimension already covered by the dedicated (more granular,
        # days-not-just-months) `auto-stale-deuda` row above -- detected via
        # shared sourceRefs rather than a hardcoded dimension name, so this
        # stays correct even if `etl/cadencia.yaml`'s dimension name ever
        # changes.
        if deuda_source_refs & set(dimension.get("sourceRefs") or []):
            continue
        lag_months = dimension["lagMonths"]
        unit = "mes" if lag_months == 1 else "meses"
        events.append(
            {
                "id": f"auto-stale-{_slugify(dimension['name'])}",
                "kind": NOVEDADES_KIND_AUTO_STALE,
                "date": (dimension.get("lastPublishedAt") or "")[:10] or None,
                "title": (
                    f"Sigue sin actualizar al día “{dimension['name']}” "
                    f"({lag_months} {unit} de rezago)"
                ),
                "detail": dimension.get("reason"),
                "sourceRefs": list(dimension.get("sourceRefs") or []),
            }
        )
    return events


def _resolve_archived_path(manifest_path: Path, archived_path: str) -> Path:
    path = Path(archived_path)
    if not path.is_absolute():
        path = manifest_path.parent / path
    return path


def _previous_documentos_snapshot_record(manifest_path: Path) -> dict[str, Any] | None:
    """The most recent SUPERSEDED (dated `{id}@{date}`) documentos snapshot
    record, if content-drift has ever archived more than one -- i.e. the
    snapshot immediately BEFORE the current one. `None` on the very first
    run (only the current, undated record exists yet). Dated ids are
    `"{id}@YYYY-MM-DD"`, so a plain lexicographic sort matches date order.
    """
    records = load_manifest(manifest_path)
    dated = [
        r
        for r in records
        if r["id"].startswith(f"{DOCUMENTOS_SNAPSHOT_MANIFEST_ID}@")
        and r.get("status") == "ok"
    ]
    if not dated:
        return None
    return max(dated, key=lambda r: r["id"])


def build_novedades(
    manifest_path: Path,
    cadencia_path: Path,
    seed_path: Path,
    *,
    previous_novedades: dict[str, Any] | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the full `data/novedades.json` payload (see module docstring
    for the three event kinds and the append/replace rules per kind).
    """
    cadencia = json.loads(cadencia_path.read_text(encoding="utf-8"))
    seeded = load_seed_events(seed_path)
    stale = derive_stale_events(cadencia)

    records = load_manifest(manifest_path)
    current_record = next(
        r for r in records if r["id"] == DOCUMENTOS_SNAPSHOT_MANIFEST_ID
    )
    current = json.loads(
        _resolve_archived_path(manifest_path, current_record["archived_path"]).read_text(
            encoding="utf-8"
        )
    )

    previous_record = _previous_documentos_snapshot_record(manifest_path)
    previous = None
    if previous_record is not None:
        previous = json.loads(
            _resolve_archived_path(
                manifest_path, previous_record["archived_path"]
            ).read_text(encoding="utf-8")
        )
    newly_detected = diff_new_documentos(previous, current)

    carried_forward = [
        e
        for e in (previous_novedades or {}).get("events", [])
        if e.get("kind") == NOVEDADES_KIND_AUTO_DETECTED
    ]
    seen_ids = {e["id"] for e in carried_forward}
    auto_detected = carried_forward + [
        e for e in newly_detected if e["id"] not in seen_ids
    ]

    events = [*seeded, *stale, *auto_detected]
    events.sort(key=lambda e: e["date"] or "", reverse=True)

    source_refs = sorted({ref for e in events for ref in e["sourceRefs"]})

    return {
        "generatedAt": (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "events": events,
        "sourceRefs": source_refs,
    }
