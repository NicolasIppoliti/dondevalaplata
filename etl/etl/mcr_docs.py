"""mcr.gob.ar/docs (Gobierno Abierto) document enumeration.

The Municipalidad publishes PDFs (RAFAM quarterly reports, Presupuesto,
Memoria) as a custom WordPress post type (``documentos``). Rather than
scraping HTML, this module enumerates them via the WordPress REST API
(``wp-json/wp/v2/documentos``); each item embeds its PDF link inside
``content.rendered`` as an ``<a href="...">`` tag.

This is F0-archival-only in this MVP: documents are captured for
provenance/rot-protection but are not parsed or surfaced in the F1 UI
(deferred to F2/F3).
"""

from __future__ import annotations

import json
import re
from typing import Protocol

BASE_URL = "https://mcr.gob.ar"

_PDF_HREF_PATTERN = re.compile(r'href="([^"]+\.pdf)"')


class Fetcher(Protocol):
    def get(self, url: str, *, timeout: float, headers: dict[str, str]): ...


def discover_documentos(fetcher: Fetcher, *, base_url: str = BASE_URL) -> list[dict]:
    """Enumerate every ``documentos`` post with an extractable PDF link."""
    url = f"{base_url}/wp-json/wp/v2/documentos?per_page=100"
    response = fetcher.get(url, timeout=30, headers={})
    posts = json.loads(response.content.decode("utf-8"))

    documentos = []
    for post in posts:
        match = _PDF_HREF_PATTERN.search(post["content"]["rendered"])
        if not match:
            continue
        documentos.append(
            {
                "slug": post["slug"],
                "title": post["title"]["rendered"],
                "date": post["date"],
                "pdf_url": match.group(1),
            }
        )
    return documentos


def to_source_entries(documentos: list[dict]) -> list[dict]:
    """Convert discovered documents into ``sources.yaml``-shaped entries."""
    entries = []
    for doc in documentos:
        entries.append(
            {
                "id": f"mcr-docs/{doc['slug']}",
                "source": "mcr.gob.ar",
                "source_url": doc["pdf_url"],
                "mime": "application/pdf",
                "notes": f"{doc['title']} (published {doc['date']})",
                "filename": f"{doc['slug']}.pdf",
            }
        )
    return entries
