"""Local filesystem archive storage.

``LocalArchiveStore`` is always active: every source archived by ``etl
archive`` is written to disk under ``archive/<capability>/<filename>``
first. This local copy is the source of truth for the SHA-256 hash and,
when Cloudflare R2 credentials are configured, the source for the R2
upload (see ``r2.py``).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path


def sha256_of(data: bytes) -> str:
    """Return the hex-encoded SHA-256 digest of ``data``."""
    return hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class LocalArchiveStore:
    """Writes fetched bytes to a local directory tree, one folder per capability."""

    root: Path

    def path_for(self, capability: str, filename: str) -> Path:
        return self.root / capability / filename

    def write(self, capability: str, filename: str, data: bytes) -> Path:
        target = self.path_for(capability, filename)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return target

    def exists(self, capability: str, filename: str) -> bool:
        return self.path_for(capability, filename).exists()

    def read(self, capability: str, filename: str) -> bytes:
        return self.path_for(capability, filename).read_bytes()
