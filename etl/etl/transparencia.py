"""Build the ASAP transparency-score display JSON from a curated source.

The ASAP "Índice de Transparencia Fiscal Municipal – Provincia de Buenos
Aires" figures are read by a human reviewer directly off the primary PDF
(see `etl/asap_transparencia.yaml`) -- this is a curated source, not a
machine-parsed one, following the same pattern as the 2022 scanned HTC
fallo (`fallos.py::load_curated_ficha`).

ASAP (Asociación Argentina de Presupuesto y Administración Financiera
Pública, Filial Provincia de Buenos Aires) is a civil/professional
association, never a ministry -- `TransparenciaScore.source_type` carries
that distinction explicitly and the web layer surfaces it verbatim so it
is never lost to a reader.

`assert_honest` is the integrity guarantee referenced by the portal's
"never fabricate a figure" doctrine: the published per-dimension
breakdown must sum to the headline total, and no dimension may claim more
than its own declared max. This runs on every build (`build_transparencia`
calls it before writing anything), so a tampered or miscopied curated
file fails the build loudly instead of shipping a silently inconsistent
number.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class Dimension:
    name: str
    got: float
    max: float


@dataclass(frozen=True)
class TrendPoint:
    report_label: str
    total: float
    category: str
    source_ref: str


@dataclass(frozen=True)
class TransparenciaScore:
    source: str
    source_full_name: str
    source_type: str
    index_name: str
    scope: str
    framework: str
    report_label: str
    data_through: str
    index_url: str
    max: float
    total: float
    category: str
    dimensions: list[Dimension]
    trend: list[TrendPoint]
    source_refs: list[str]


def load_curated_transparencia(path: Path) -> TransparenciaScore:
    """Load the curated ASAP transparency score (see module docstring)."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    dimensions = [
        Dimension(name=d["name"], got=d["got"], max=d["max"]) for d in raw["dimensions"]
    ]
    trend = [
        TrendPoint(
            report_label=t["report_label"],
            total=t["total"],
            category=t["category"],
            source_ref=t["source_ref"],
        )
        for t in raw["trend"]
    ]
    return TransparenciaScore(
        source=raw["source"],
        source_full_name=raw["source_full_name"],
        source_type=raw["source_type"],
        index_name=raw["index_name"],
        scope=raw["scope"],
        framework=raw["framework"],
        report_label=raw["report_label"],
        data_through=raw["data_through"],
        index_url=raw["index_url"],
        max=raw["max"],
        total=raw["total"],
        category=raw["category"],
        dimensions=dimensions,
        trend=trend,
        source_refs=list(raw["source_refs"]),
    )


def assert_honest(score: TransparenciaScore) -> None:
    """Integrity guarantee: the published breakdown must sum to the
    headline total, and no dimension may exceed its own max.

    Raises ``ValueError`` (never silently corrects or drops data) so a
    tampered/miscopied curated source fails the build loudly.
    """
    dimension_sum = sum(d.got for d in score.dimensions)
    if dimension_sum != score.total:
        raise ValueError(
            "transparencia honesty check failed: dimensions sum to "
            f"{dimension_sum}, expected total {score.total}"
        )
    for d in score.dimensions:
        if d.got > d.max:
            raise ValueError(
                f"transparencia honesty check failed: dimension {d.name!r} got "
                f"{d.got} exceeds its own max {d.max}"
            )


def build_transparencia(curated_path: Path, *, now: datetime | None = None) -> dict[str, Any]:
    """Build the full `data/transparencia.json` payload (task 2).

    Runs `assert_honest` before returning anything, so the build fails
    rather than publishing an internally inconsistent breakdown.
    """
    score = load_curated_transparencia(curated_path)
    assert_honest(score)
    generated_at = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "generatedAt": generated_at,
        "source": score.source,
        "sourceFullName": score.source_full_name,
        "sourceType": score.source_type,
        "indexName": score.index_name,
        "scope": score.scope,
        "framework": score.framework,
        "reportLabel": score.report_label,
        "dataThrough": score.data_through,
        "indexUrl": score.index_url,
        "max": score.max,
        "total": score.total,
        "category": score.category,
        "dimensions": [{"name": d.name, "got": d.got, "max": d.max} for d in score.dimensions],
        "trend": [
            {
                "reportLabel": t.report_label,
                "total": t.total,
                "category": t.category,
                "sourceRef": t.source_ref,
            }
            for t in score.trend
        ],
        "sourceRefs": score.source_refs,
    }
