"""Loader for ``etl/sources.yaml``, the static source registry (design D4)."""

from __future__ import annotations

from pathlib import Path

import yaml

KNOWN_CAPABILITIES = (
    "coparticipacion-viewer",
    "htc-fallos",
    "ipc",
    "electoral",
    "sibom",
    "sibom-actos",
    "mcr-docs",
    "mcr-docs-snapshot",
    "asap-transparencia",
)


def load_sources(path: Path) -> dict[str, list[dict]]:
    """Load the source registry, defaulting any missing capability to ``[]``."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return {capability: raw.get(capability) or [] for capability in KNOWN_CAPABILITIES}
