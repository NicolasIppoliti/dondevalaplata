"""Unit tests for the sources.yaml loader (etl.config)."""

from etl.config import load_sources


def test_load_sources_returns_capability_dict(tmp_path) -> None:
    path = tmp_path / "sources.yaml"
    path.write_text(
        """
coparticipacion-viewer:
  - id: coparticipacion/example
    source: example.org
    source_url: https://example.org/file.csv
    mime: text/csv
    notes: sample
htc-fallos: []
""",
        encoding="utf-8",
    )

    sources = load_sources(path)

    assert list(sources["coparticipacion-viewer"]) == [
        {
            "id": "coparticipacion/example",
            "source": "example.org",
            "source_url": "https://example.org/file.csv",
            "mime": "text/csv",
            "notes": "sample",
        }
    ]
    assert sources["htc-fallos"] == []


def test_load_sources_defaults_missing_capabilities_to_empty_list(tmp_path) -> None:
    path = tmp_path / "sources.yaml"
    path.write_text("coparticipacion-viewer: []\n", encoding="utf-8")

    sources = load_sources(path)

    assert sources["sibom"] == []
    assert sources["mcr-docs"] == []
    assert sources["asap-transparencia"] == []
    assert sources["poblacion-censo"] == []


def test_load_sources_surfaces_poblacion_censo_capability(tmp_path) -> None:
    # Regression: KNOWN_CAPABILITIES must list every real sources.yaml
    # top-level key, or `etl archive --capability X` silently no-ops for
    # any capability missing from the tuple (the filter step in
    # cli.run_archive drops it before archive_source ever runs).
    path = tmp_path / "sources.yaml"
    path.write_text(
        """
poblacion-censo:
  - id: poblacion-censo/example
    source: example.org
    source_url: https://example.org/poblacion.csv
    mime: text/csv
    notes: sample
""",
        encoding="utf-8",
    )

    sources = load_sources(path)

    assert list(sources["poblacion-censo"]) == [
        {
            "id": "poblacion-censo/example",
            "source": "example.org",
            "source_url": "https://example.org/poblacion.csv",
            "mime": "text/csv",
            "notes": "sample",
        }
    ]
