"""Unit tests for the mcr.gob.ar/docs Gobierno Abierto document enumerator.

Documents are enumerated via the WordPress REST API (``wp-json/wp/v2/
documentos``); each item embeds its PDF link in ``content.rendered``.
This is F0-archival-only in this MVP (no ETL build/UI consumption).
"""

from pathlib import Path

from etl.mcr_docs import discover_documentos, to_source_entries

FIXTURE_JSON = Path(__file__).parent / "fixtures" / "mcr_documentos_sample.json"


class FakeFetcher:
    def __init__(self) -> None:
        self.calls: list[str] = []

    def get(self, url: str, *, timeout: float, headers: dict[str, str]):
        from etl.archive import FetchResponse

        self.calls.append(url)
        return FetchResponse(200, FIXTURE_JSON.read_bytes())


def test_discover_documentos_extracts_pdf_href_and_skips_entries_without_one() -> None:
    fetcher = FakeFetcher()
    documentos = discover_documentos(fetcher)

    assert len(documentos) == 2  # the "no-attachment-example" entry is skipped
    assert documentos[0] == {
        "slug": "situacion-economica-financiera-primer-semestre-2026",
        "title": "SITUACION ECONOMICA FINANCIERA PRIMER SEMESTRE 2026",
        "date": "2026-07-01T12:53:56",
        "pdf_url": (
            "https://mcr.gob.ar/wp-content/uploads/2026/07/"
            "SITUACION-ECONOMICA-FINANCIERA-PRIMER-SEMESTRE-2026.pdf"
        ),
    }


def test_discover_documentos_calls_wp_json_endpoint_with_per_page_100() -> None:
    fetcher = FakeFetcher()
    discover_documentos(fetcher)

    assert fetcher.calls == ["https://mcr.gob.ar/wp-json/wp/v2/documentos?per_page=100"]


def test_to_source_entries_builds_sources_yaml_shaped_dicts() -> None:
    documentos = [
        {
            "slug": "memoria-general-anual-ejercicio-2025",
            "title": "Memoria General Anual Ejercicio 2025",
            "date": "2026-04-01T00:00:00",
            "pdf_url": (
                "https://mcr.gob.ar/wp-content/uploads/2026/04/"
                "Memoria-General-Anual-Ejercicio-2025.pdf"
            ),
        }
    ]

    entries = to_source_entries(documentos)

    assert entries == [
        {
            "id": "mcr-docs/memoria-general-anual-ejercicio-2025",
            "source": "mcr.gob.ar",
            "source_url": (
                "https://mcr.gob.ar/wp-content/uploads/2026/04/"
                "Memoria-General-Anual-Ejercicio-2025.pdf"
            ),
            "mime": "application/pdf",
            "notes": "Memoria General Anual Ejercicio 2025 (published 2026-04-01T00:00:00)",
            "filename": "memoria-general-anual-ejercicio-2025.pdf",
        }
    ]
