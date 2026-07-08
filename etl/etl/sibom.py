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
from collections.abc import Callable
from pathlib import Path
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


_ACT_PATTERN = re.compile(
    r'<a class="content-link" href="(/bulletins/\d+/contents/(\d+))">'
    r'<div class="white-box (\w+)"><p>[^<]*?N[ºo°]\s*(\d+)\s*/\s*(\d{2,4})</p>'
    r'<p class="extracted-version-disclaimer">([^<]*)</p>'
)


def parse_decree_acts_listing(html: str) -> list[dict]:
    """Parse a single bulletin's listing page (``/bulletins/{id}``) into its
    individual "decree"-class acts (Decreto Nº N/YYYY -> content id).

    Every act on the page carries a type class (``decree``, ``resolution``,
    ...); only ``decree`` acts are returned since adjudicación decisions are
    always Departamento Ejecutivo decretos (see ``sibom_adjudicaciones.py``).
    Each act also carries an "extracted version" disclaimer flag when SIBOM
    only published a short summary instead of the act's full legal text
    (those acts cannot yield a verifiable adjudicación row downstream, but
    are still returned here -- deciding what to do with them is the
    parser's job, not the listing's).
    """
    acts = []
    for href, content_id, act_type, number, year, disclaimer in _ACT_PATTERN.findall(html):
        if act_type != "decree":
            continue
        acts.append(
            {
                "number": int(number),
                "year": year,
                "content_id": content_id,
                "href": href,
                "extracted_version": bool(disclaimer.strip()),
            }
        )
    return acts


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


def discover_sibom_actos(
    fetcher: Fetcher,
    *,
    manifest_path: Path,
    base_url: str = BASE_URL,
    text_extractor: Callable[[Path], str] | None = None,
) -> list[dict]:
    """Discover individual adjudicación decree acts within already-archived
    SIBOM bulletins (feature G3).

    Reuses the bulletin PDFs archived under the ``sibom`` capability (F0,
    "reuse/extend, don't duplicate needlessly"): parses each PDF's text
    OFFLINE (no network) to find candidate adjudicación decretos (see
    ``etl.sibom_adjudicaciones.find_candidate_decrees``). Only for bulletins
    with at least one candidate does this make a network request -- one
    lightweight fetch of that bulletin's HTML listing page
    (``/bulletins/{id}``) -- to resolve each candidate's own act URL
    (``/bulletins/{id}/contents/{content_id}``) via `parse_decree_acts_listing`.

    A candidate whose (number, year) is not confirmed by the listing page is
    dropped rather than archived with a guessed URL (never fabricate a
    source link). Returns ``sources.yaml``-shaped entries for the individual
    act HTML pages only -- the whole bulletin is never re-archived here.
    """
    from .manifest import load_manifest
    from .sibom_adjudicaciones import find_candidate_decrees, normalize_bulletin_text

    if text_extractor is None:
        from .fallos import extract_pdf_text as text_extractor  # type: ignore[assignment]

    records = load_manifest(manifest_path)
    bulletin_records = [
        r
        for r in records
        if r["id"].startswith("sibom/boletin-") and r.get("status") == "ok"
    ]

    entries: list[dict] = []
    for record in sorted(bulletin_records, key=lambda r: r["id"]):
        pdf_path = manifest_path.parent / record["archived_path"]
        raw_text = text_extractor(pdf_path)
        text = normalize_bulletin_text(raw_text)
        candidates = find_candidate_decrees(text)
        if not candidates:
            continue

        bulletin_key = record["id"].rsplit("/", 1)[-1]  # boletin-031
        bulletin_id = record["source_url"].rsplit("/", 1)[-1].removesuffix(".pdf")
        listing_url = f"{base_url}/bulletins/{bulletin_id}"
        response = fetcher.get(listing_url, timeout=30, headers={})
        html = response.content.decode("utf-8", errors="replace")
        acts_by_number = {
            (act["number"], act["year"] if len(act["year"]) == 4 else f"20{act['year']}"): act[
                "content_id"
            ]
            for act in parse_decree_acts_listing(html)
        }

        for candidate in candidates:
            content_id = acts_by_number.get((candidate["number"], candidate["year"]))
            if content_id is None:
                continue  # not confirmed by the listing page -- never guess a URL
            slug = f"{bulletin_key}-decreto-{candidate['number']:03d}-{candidate['year']}"
            entries.append(
                {
                    "id": f"sibom-actos/{slug}",
                    "source": "sibom.slyt.gba.gob.ar",
                    "source_url": f"{base_url}/bulletins/{bulletin_id}/contents/{content_id}",
                    "mime": "text/html",
                    "notes": (
                        f"Decreto Nº {candidate['number']}/{candidate['year']} "
                        f"(adjudicación) -- {bulletin_key}"
                    ),
                    "filename": f"{slug}.html",
                }
            )
    return entries
