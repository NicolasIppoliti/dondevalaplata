"""HTTP fetcher used by the archival pipeline (see ``archive.py``).

Wraps ``requests`` with a small retry loop and a generous timeout, since
some sources are large (electoral ZIPs) or slow (Wayback Machine
mirrors). Always sends a descriptive User-Agent identifying the portal
project (see ``archive.DEFAULT_USER_AGENT``), per the SIBOM politeness
requirement.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import requests

from .archive import FetchResponse


@dataclass
class RequestsFetcher:
    max_retries: int = 3
    retry_delay_seconds: float = 2.0

    def head(
        self, url: str, *, timeout: float = 30, headers: dict[str, str] | None = None
    ) -> FetchResponse:
        """Lightweight reachability check: no retries, no response body."""
        response = requests.head(
            url, timeout=timeout, headers=headers or {}, allow_redirects=True
        )
        return FetchResponse(
            status_code=response.status_code, content=b"", headers=dict(response.headers)
        )

    def get(
        self, url: str, *, timeout: float = 60, headers: dict[str, str] | None = None
    ) -> FetchResponse:
        last_exc: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.get(
                    url, timeout=timeout, headers=headers or {}, allow_redirects=True
                )
                return FetchResponse(
                    status_code=response.status_code,
                    content=response.content,
                    headers=dict(response.headers),
                )
            except requests.RequestException as exc:
                last_exc = exc
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay_seconds)
        assert last_exc is not None
        raise last_exc
