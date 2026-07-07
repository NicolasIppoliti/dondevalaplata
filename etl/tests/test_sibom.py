"""Unit tests for the SIBOM bulletin listing fetcher (etl.sibom).

SIBOM (sibom.slyt.gba.gob.ar/cities/28) is a paginated listing; bulletins
are archived for the Municipio de Coronel Rosales from Nº31 (2023)
onward. This is F0-archival-only in this MVP (no ETL build/UI
consumption) — it feeds F2/F3. Uses a fake fetcher; no network I/O here.
"""

from pathlib import Path

from etl.sibom import discover_bulletins, to_source_entries

FIXTURE_PAGE = Path(__file__).parent / "fixtures" / "sibom_page_sample.html"


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
