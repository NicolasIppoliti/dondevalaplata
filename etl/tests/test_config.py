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
