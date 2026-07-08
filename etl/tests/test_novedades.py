"""Unit tests for the watchdog "novedades" feed (feature H2b,
`etl/novedades.py`). Every fixture here is synthetic (never the real
archive) -- this module never needs the CI-hygiene local-file skip guard.
"""

import json
from pathlib import Path

from etl.novedades import (
    NOVEDADES_KIND_AUTO_DETECTED,
    NOVEDADES_KIND_AUTO_STALE,
    NOVEDADES_KIND_SEEDED,
    build_novedades,
    derive_stale_events,
    diff_new_documentos,
    load_seed_events,
)


def test_load_seed_events_parses_yaml(tmp_path: Path) -> None:
    seed_path = tmp_path / "seed.yaml"
    seed_path.write_text(
        """
events:
  - id: "seed-a"
    date: "2026-01-01"
    title: "Título A"
    detail: "Detalle A"
    source_refs: ["mcr-docs/a"]
""",
        encoding="utf-8",
    )
    events = load_seed_events(seed_path)
    assert events == [
        {
            "id": "seed-a",
            "kind": NOVEDADES_KIND_SEEDED,
            "date": "2026-01-01",
            "title": "Título A",
            "detail": "Detalle A",
            "sourceRefs": ["mcr-docs/a"],
        }
    ]


def test_diff_new_documentos_returns_empty_when_no_previous_snapshot() -> None:
    current = [{"slug": "a", "title": {"rendered": "A"}, "date": "2026-01-01T00:00:00"}]
    assert diff_new_documentos(None, current) == []


def test_diff_new_documentos_detects_a_newly_published_slug() -> None:
    previous = [{"slug": "a", "title": {"rendered": "A"}, "date": "2026-01-01T00:00:00"}]
    current = [
        {"slug": "a", "title": {"rendered": "A"}, "date": "2026-01-01T00:00:00"},
        {"slug": "b", "title": {"rendered": "Documento B"}, "date": "2026-02-15T10:30:00"},
    ]
    events = diff_new_documentos(previous, current)
    assert len(events) == 1
    assert events[0]["kind"] == NOVEDADES_KIND_AUTO_DETECTED
    assert events[0]["date"] == "2026-02-15"
    assert "Documento B" in events[0]["title"]
    assert events[0]["sourceRefs"] == ["mcr-docs/b"]


def test_diff_new_documentos_ignores_already_seen_slugs() -> None:
    previous = [{"slug": "a", "title": {"rendered": "A"}, "date": "2026-01-01T00:00:00"}]
    current = [{"slug": "a", "title": {"rendered": "A"}, "date": "2026-01-01T00:00:00"}]
    assert diff_new_documentos(previous, current) == []


def test_derive_stale_events_deuda_and_dimension_gaps() -> None:
    cadencia = {
        "deuda": {
            "lastPeriod": "3er trimestre 2025",
            "lastPeriodEnd": "2025-09-30",
            "lastFigureLabel": "$ 46.876.896,86",
            "quartersMissing": 3,
            "elapsedDays": 281,
            "sourceRefs": ["mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre"],
        },
        "dimensions": [
            {
                "name": "Acceso web fácil a la información",
                "got": 5,
                "max": 5,
                "lagMonths": None,
                "lastPublishedAt": None,
                "reason": "Al máximo.",
                "sourceRefs": [],
            },
            {
                "name": "Gastos por finalidad y función",
                "got": 3,
                "max": 10,
                "lagMonths": 2,
                "lastPublishedAt": "2026-04-15T23:36:16",
                "reason": "Medio año de rezago.",
                "sourceRefs": ["mcr-docs/gastos-por-finalidad-y-funcion"],
            },
        ],
    }
    events = derive_stale_events(cadencia)

    assert len(events) == 2
    deuda_event = next(e for e in events if e["id"] == "auto-stale-deuda")
    assert deuda_event["kind"] == NOVEDADES_KIND_AUTO_STALE
    assert "281 días" in deuda_event["title"]
    assert "3 trimestres" in deuda_event["title"]
    assert deuda_event["sourceRefs"] == [
        "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre"
    ]

    dim_event = next(e for e in events if e["id"] == "auto-stale-gastos-por-finalidad-y-funcion")
    assert dim_event["kind"] == NOVEDADES_KIND_AUTO_STALE
    assert "2 meses" in dim_event["title"]

    # A dimension at max (got >= max) never gets a "still stale" row.
    assert not any("acceso-web" in e["id"] for e in events)


def test_derive_stale_events_never_duplicates_the_deuda_dimension() -> None:
    """Regression guard: the generic per-dimension loop must not ALSO emit
    a row for the same "Stock de deuda" gap the dedicated `auto-stale-deuda`
    row (days + trimestres) already covers -- detected via shared
    sourceRefs, see `derive_stale_events`'s inline comment."""
    cadencia = {
        "deuda": {
            "lastPeriod": "3er trimestre 2025",
            "lastPeriodEnd": "2025-09-30",
            "lastFigureLabel": "$ 46.876.896,86",
            "quartersMissing": 3,
            "elapsedDays": 281,
            "sourceRefs": ["mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre"],
        },
        "dimensions": [
            {
                "name": "Stock de deuda y perfil de vencimientos",
                "got": 3,
                "max": 10,
                "lagMonths": 8,
                "lastPublishedAt": "2025-11-05T14:53:05",
                "reason": "El municipio dejó de actualizar esta serie.",
                "sourceRefs": [
                    "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre"
                ],
            },
        ],
    }
    events = derive_stale_events(cadencia)

    assert len(events) == 1
    assert events[0]["id"] == "auto-stale-deuda"


def _write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_build_novedades_seeds_stale_and_bootstrap_has_no_auto_detected(
    tmp_path: Path,
) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    current_snapshot_path = tmp_path / "documentos-snapshot.json"
    _write_json(
        current_snapshot_path,
        [{"slug": "a", "title": {"rendered": "A"}, "date": "2026-01-01T00:00:00"}],
    )
    _write_json(
        manifest_path,
        [
            {
                "id": "mcr-docs-snapshot/documentos",
                "capability": "mcr-docs-snapshot",
                "archived_path": str(current_snapshot_path),
                "status": "ok",
            }
        ],
    )

    cadencia_path = tmp_path / "cadencia.json"
    _write_json(
        cadencia_path,
        {
            "deuda": {
                "lastPeriod": "3er trimestre 2025",
                "lastPeriodEnd": "2025-09-30",
                "lastFigureLabel": "$ 46.876.896,86",
                "quartersMissing": 3,
                "elapsedDays": 281,
                "sourceRefs": [
                    "mcr-docs/stock-de-deuda-y-perfil-de-vencimientos-3o-trimestre"
                ],
            },
            "dimensions": [],
        },
    )

    seed_path = tmp_path / "seed.yaml"
    seed_path.write_text(
        """
events:
  - id: "seed-a"
    date: "2026-01-01"
    title: "Título A"
    source_refs: ["mcr-docs/a"]
""",
        encoding="utf-8",
    )

    result = build_novedades(manifest_path, cadencia_path, seed_path)

    kinds = {e["kind"] for e in result["events"]}
    assert kinds == {NOVEDADES_KIND_SEEDED, NOVEDADES_KIND_AUTO_STALE}
    assert "mcr-docs/a" in result["sourceRefs"]
    # Sorted newest-first.
    dates = [e["date"] for e in result["events"]]
    assert dates == sorted(dates, reverse=True)


def test_build_novedades_carries_forward_previous_auto_detected_events(
    tmp_path: Path,
) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    current_snapshot_path = tmp_path / "documentos-snapshot.json"
    previous_snapshot_path = tmp_path / "documentos-snapshot-previous.json"
    _write_json(
        previous_snapshot_path,
        [{"slug": "a", "title": {"rendered": "A"}, "date": "2026-01-01T00:00:00"}],
    )
    _write_json(
        current_snapshot_path,
        [
            {"slug": "a", "title": {"rendered": "A"}, "date": "2026-01-01T00:00:00"},
            {"slug": "b", "title": {"rendered": "B"}, "date": "2026-05-01T00:00:00"},
        ],
    )
    _write_json(
        manifest_path,
        [
            {
                "id": "mcr-docs-snapshot/documentos@2026-01-01",
                "capability": "mcr-docs-snapshot",
                "archived_path": str(previous_snapshot_path),
                "status": "ok",
            },
            {
                "id": "mcr-docs-snapshot/documentos",
                "capability": "mcr-docs-snapshot",
                "archived_path": str(current_snapshot_path),
                "status": "ok",
            },
        ],
    )
    cadencia_path = tmp_path / "cadencia.json"
    _write_json(cadencia_path, {"deuda": {"quartersMissing": 0}, "dimensions": []})
    seed_path = tmp_path / "seed.yaml"
    seed_path.write_text("events: []\n", encoding="utf-8")

    # First run: detects "b" as newly published.
    first_result = build_novedades(manifest_path, cadencia_path, seed_path)
    auto_detected = [
        e for e in first_result["events"] if e["kind"] == NOVEDADES_KIND_AUTO_DETECTED
    ]
    assert len(auto_detected) == 1
    assert auto_detected[0]["id"] == "auto-published-b"

    # Second run: no NEW snapshot to diff (same manifest), but the previous
    # run's auto-detected event must be carried forward, not lost.
    second_result = build_novedades(
        manifest_path, cadencia_path, seed_path, previous_novedades=first_result
    )
    auto_detected_2 = [
        e for e in second_result["events"] if e["kind"] == NOVEDADES_KIND_AUTO_DETECTED
    ]
    assert len(auto_detected_2) == 1
    assert auto_detected_2[0]["id"] == "auto-published-b"
