"""SIBOM (Sistema de Boletines Oficiales Municipales) listing discovery.

Enumerates every bulletin published for the Municipio de Coronel Rosales
(``sibom.slyt.gba.gob.ar/cities/28``) from a given edition number onward.
The listing is paginated (~11 pages as of 2026-07) and sorted newest
first, so pagination stops as soon as a page's oldest entry falls below
the cutoff.

This is F0-archival-only in this MVP: bulletins are captured for
provenance/rot-protection but are not parsed or surfaced in the F1 UI
(deferred to F2/F3).
"""

from __future__ import annotations

import re
from typing import Protocol

BASE_URL = "https://sibom.slyt.gba.gob.ar"

_ROW_PATTERN = re.compile(
    r'bulletin-title">(\d+)º de Coronel Rosales</p>'
    r'<p class="bulletin-date">Publicado el (\d{2}/\d{2}/\d{4})</p>'
    r'</div><div class="col-xs-4"><form class="button_to" method="get" '
    r'action="(/bulletins/\d+)"'
)


class Fetcher(Protocol):
    def get(self, url: str, *, timeout: float, headers: dict[str, str]): ...


def discover_bulletins(
    fetcher: Fetcher,
    *,
    from_number: int,
    max_pages: int = 11,
    city_id: int = 28,
    base_url: str = BASE_URL,
) -> list[dict]:
    """Return every bulletin at or above ``from_number``, newest first.

    Fetches pages sequentially starting at 1 and stops as soon as a page
    contains an entry below ``from_number`` (the listing is sorted newest
    first, so this is always safe) or ``max_pages`` is reached.
    """
    bulletins: list[dict] = []
    for page in range(1, max_pages + 1):
        url = f"{base_url}/cities/{city_id}?page={page}"
        response = fetcher.get(url, timeout=30, headers={})
        html = response.content.decode("utf-8", errors="replace")
        rows = _ROW_PATTERN.findall(html)
        if not rows:
            break

        reached_cutoff = False
        for number_str, date, path in rows:
            number = int(number_str)
            if number < from_number:
                reached_cutoff = True
                break
            bulletins.append({"number": number, "date": date, "path": path})

        if reached_cutoff:
            break
    return bulletins


def to_source_entries(bulletins: list[dict], *, base_url: str = BASE_URL) -> list[dict]:
    """Convert discovered bulletins into ``sources.yaml``-shaped entries."""
    entries = []
    for bulletin in bulletins:
        number = bulletin["number"]
        bulletin_id = bulletin["path"].rsplit("/", 1)[-1]
        entries.append(
            {
                "id": f"sibom/boletin-{number:03d}",
                "source": "sibom.slyt.gba.gob.ar",
                "source_url": f"{base_url}/bulletins/{bulletin_id}.pdf",
                "mime": "application/pdf",
                "notes": (
                    f"Boletín {number}º de Coronel Rosales, publicado {bulletin['date']}"
                ),
                "filename": f"boletin-{number:03d}.pdf",
            }
        )
    return entries
