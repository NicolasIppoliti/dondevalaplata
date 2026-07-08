"""Unit tests for the SIBOM bulletin listing fetcher (etl.sibom).

SIBOM (sibom.slyt.gba.gob.ar/cities/28) is a paginated listing; bulletins
are archived for the Municipio de Coronel Rosales from Nº31 (2023)
onward. This is F0-archival-only in this MVP (no ETL build/UI
consumption) — it feeds F2/F3. Uses a fake fetcher; no network I/O here.
"""

import json
from pathlib import Path

from etl.sibom import (
    discover_bulletins,
    discover_sibom_actos,
    parse_decree_acts_listing,
    to_source_entries,
)

FIXTURE_PAGE = Path(__file__).parent / "fixtures" / "sibom_page_sample.html"
FIXTURE_CONTENTS_PAGE = (
    Path(__file__).parent / "fixtures" / "sibom_bulletin_contents_sample.html"
)
FIXTURE_DECREE_524 = Path(__file__).parent / "fixtures" / "sibom_decreto_524_2023_extract.txt"


class FakeFetcher:
    """Serves page 1 (with 3 bulletins, one below the cutoff) then an empty page 2."""

    def __init__(self) -> None:
        self.calls: list[str] = []

    def get(self, url: str, *, timeout: float, headers: dict[str, str]):
        from etl.archive import FetchResponse

        self.calls.append(url)
        if "page=2" in url:
            return FetchResponse(200, b"<div>no more bulletins</div>")
        return FetchResponse(200, FIXTURE_PAGE.read_bytes())


def test_discover_bulletins_parses_title_date_and_path() -> None:
    fetcher = FakeFetcher()
    bulletins = discover_bulletins(fetcher, from_number=31, max_pages=11)

    assert len(bulletins) == 2  # 86 and 85; the 30 entry is below the cutoff
    assert bulletins[0] == {
        "number": 86,
        "date": "18/06/2026",
        "path": "/bulletins/15135",
    }
    assert bulletins[1]["number"] == 85


def test_discover_bulletins_stops_once_below_cutoff() -> None:
    fetcher = FakeFetcher()
    discover_bulletins(fetcher, from_number=31, max_pages=11)

    # Only page 1 was fetched: bulletin 30 (below cutoff) stops pagination.
    assert fetcher.calls == ["https://sibom.slyt.gba.gob.ar/cities/28?page=1"]


def test_to_source_entries_builds_sources_yaml_shaped_dicts() -> None:
    bulletins = [{"number": 31, "date": "28/04/2023", "path": "/bulletins/7283"}]

    entries = to_source_entries(bulletins)

    assert entries == [
        {
            "id": "sibom/boletin-031",
            "source": "sibom.slyt.gba.gob.ar",
            "source_url": "https://sibom.slyt.gba.gob.ar/bulletins/7283.pdf",
            "mime": "application/pdf",
            "notes": "Boletín 31º de Coronel Rosales, publicado 28/04/2023",
            "filename": "boletin-031.pdf",
        }
    ]


def test_parse_decree_acts_listing_extracts_decrees_only() -> None:
    html = FIXTURE_CONTENTS_PAGE.read_text(encoding="utf-8")

    acts = parse_decree_acts_listing(html)

    # The lone "resolution" entry is excluded -- only "decree"-class acts
    # matter for adjudicación discovery (see sibom_adjudicaciones.py).
    assert acts == [
        {
            "number": 523,
            "year": "2023",
            "content_id": "1980001",
            "href": "/bulletins/9568/contents/1980001",
            "extracted_version": False,
        },
        {
            "number": 524,
            "year": "2023",
            "content_id": "1980017",
            "href": "/bulletins/9568/contents/1980017",
            "extracted_version": False,
        },
        {
            "number": 525,
            "year": "2023",
            "content_id": "1980032",
            "href": "/bulletins/9568/contents/1980032",
            "extracted_version": True,
        },
    ]


class _FakeListingFetcher:
    """Serves the bulletin contents-listing page for /bulletins/9568."""

    def __init__(self) -> None:
        self.calls: list[str] = []

    def get(self, url: str, *, timeout: float, headers: dict[str, str]):
        from etl.archive import FetchResponse

        self.calls.append(url)
        assert url == "https://sibom.slyt.gba.gob.ar/bulletins/9568"
        return FetchResponse(200, FIXTURE_CONTENTS_PAGE.read_bytes())


def test_discover_sibom_actos_resolves_candidate_act_urls(tmp_path) -> None:
    manifest_path = tmp_path / "archive-manifest.json"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": "sibom/boletin-036",
                    "capability": "sibom",
                    "source": "sibom.slyt.gba.gob.ar",
                    "source_url": "https://sibom.slyt.gba.gob.ar/bulletins/9568.pdf",
                    "archived_url": "https://example.com/boletin-036.pdf",
                    "archived_path": "archive/sibom/boletin-036.pdf",
                    "sha256": "deadbeef",
                    "mime": "application/pdf",
                    "bytes": 123,
                    "fetched_at": "2026-01-01T00:00:00Z",
                    "status": "ok",
                    "notes": "",
                }
            ]
        ),
        encoding="utf-8",
    )

    fixture_text = FIXTURE_DECREE_524.read_text(encoding="utf-8")
    fetcher = _FakeListingFetcher()

    entries = discover_sibom_actos(
        fetcher,
        manifest_path=manifest_path,
        text_extractor=lambda _path: fixture_text,
    )

    assert len(entries) == 1
    entry = entries[0]
    assert entry["id"] == "sibom-actos/boletin-036-decreto-524-2023"
    assert entry["source_url"] == "https://sibom.slyt.gba.gob.ar/bulletins/9568/contents/1980017"
    assert entry["mime"] == "text/html"
    assert fetcher.calls == ["https://sibom.slyt.gba.gob.ar/bulletins/9568"]


def test_discover_sibom_actos_skips_candidates_not_confirmed_by_listing(tmp_path) -> None:
    """If the PDF-text candidate's decree number isn't found on the listing
    page (format drift, a stub act, etc.), never guess a URL -- skip it.
    """
    manifest_path = tmp_path / "archive-manifest.json"
    manifest_path.write_text(
        json.dumps(
            [
                {
                    "id": "sibom/boletin-036",
                    "capability": "sibom",
                    "source": "sibom.slyt.gba.gob.ar",
                    "source_url": "https://sibom.slyt.gba.gob.ar/bulletins/9568.pdf",
                    "archived_url": "https://example.com/boletin-036.pdf",
                    "archived_path": "archive/sibom/boletin-036.pdf",
                    "sha256": "deadbeef",
                    "mime": "application/pdf",
                    "bytes": 123,
                    "fetched_at": "2026-01-01T00:00:00Z",
                    "status": "ok",
                    "notes": "",
                }
            ]
        ),
        encoding="utf-8",
    )
    # A decree number (999/2023) the fixture listing page does not contain.
    unmatched_text = (
        "Decreto Nº 999/2023\nCoronel Rosales, 01/01/2023\nVisto\nx\nDECRETA\n"
        'ARTICULO 1º: Adjudicar a la firma "ACME SA" por la suma de PESOS UN MIL '
        "($ 1.000,00.-).-"
    )
    fetcher = _FakeListingFetcher()

    entries = discover_sibom_actos(
        fetcher,
        manifest_path=manifest_path,
        text_extractor=lambda _path: unmatched_text,
    )

    assert entries == []
