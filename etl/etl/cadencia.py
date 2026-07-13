"""Live ASAP publication-cadence derivation (`data/cadencia.json`).

Pairs two sources: the curated ASAP score (`etl/asap_transparencia.yaml`,
human-verified `got`/`max` per dimension -- single source of truth, never
duplicated here) and the LIVE mcr.gob.ar/wp-json/wp/v2/documentos listing
snapshot (archived verbatim under the ``mcr-docs-snapshot`` capability),
to answer: for each of the 6 ASAP dimensions, what is the freshest document
actually published right now, and how stale is it?

The curated overlay (`etl/cadencia.yaml`) supplies which title keywords
identify each dimension's document series, and the human-verified,
sourced, factual explanation of each gap (see engram topic
data/gap-100-y-detalle-gasto) -- never an evaluative judgment of a person
or administration (DESIGN.md neutrality rule).

Live drift tripwire: `derive_dimension_cadence`/`derive_deuda_cadence`
raise ``ValueError`` when the freshest live-matched document has moved
past what the curated `reason`/`to_reach_10` prose describes (see each
dimension's ``expected_latest_period_contains``, and the deuda block's
`source_ref`) -- a human must re-curate the prose once the municipality
actually publishes something new; the build must never silently keep
shipping stale reasoning next to fresher live data. Same doctrine as
`manifest.py`'s content-drift handling and `transparencia.assert_honest`.
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field
from datetime import UTC, datetime
from datetime import timedelta as _timedelta
from pathlib import Path
from typing import Any

import yaml

from .manifest import resolve_archived_path
from .transparencia import load_curated_transparencia

DOCUMENTOS_SNAPSHOT_MANIFEST_ID = "mcr-docs-snapshot/documentos"

# A dimension's underlying document series counts as "caught up" (currently
# published on time) once its lag is within this many whole months -- the
# same "a lo sumo 1 mes" tolerance `etl/cadencia.yaml`'s own `to_reach_10`
# prose already documents for "Ejecución presupuestaria trimestral" and
# "Gastos por finalidad y función". This is DELIBERATELY separate from the
# frozen `got`/`max` ASAP score (never re-derived here, see
# `etl/asap_transparencia.yaml`'s honesty doctrine): a dimension can be
# caught-up-live (fresh document, `caughtUp: true`) while still showing
# `got < max` because ASAP itself has not re-scored the municipality yet --
# the UI and `etl.novedades` use `caughtUp`, never `got`/`max`, to decide
# whether a "still stale" watchdog fact should render.
CAUGHT_UP_LAG_MONTHS_TOLERANCE = 1


def normalize(text: str) -> str:
    """Lowercase and strip accents, for accent/case-insensitive keyword matching."""
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn")


def matches_document(
    title: str, keywords: list[str], exclude_keywords: list[str] | None = None
) -> bool:
    """Whether ``title`` contains any of ``keywords`` and none of ``exclude_keywords``."""
    normalized_title = normalize(title)
    if not any(normalize(kw) in normalized_title for kw in keywords):
        return False
    if exclude_keywords and any(normalize(kw) in normalized_title for kw in exclude_keywords):
        return False
    return True


def _parse_wp_date(raw: str) -> datetime:
    return datetime.fromisoformat(raw)


def latest_matching(
    documentos: list[dict[str, Any]],
    keywords: list[str],
    exclude_keywords: list[str] | None = None,
) -> dict[str, Any] | None:
    """Return the most recently published documento matching ``keywords``, or ``None``."""
    matches = [
        doc
        for doc in documentos
        if matches_document(doc["title"]["rendered"], keywords, exclude_keywords)
    ]
    if not matches:
        return None
    return max(matches, key=lambda doc: _parse_wp_date(doc["date"]))


def months_between(earlier: datetime, later: datetime) -> int:
    """Whole calendar months elapsed from ``earlier`` to ``later`` (never negative)."""
    months = (later.year - earlier.year) * 12 + (later.month - earlier.month)
    if later.day < earlier.day:
        months -= 1
    return max(months, 0)


@dataclass(frozen=True)
class SubSeriesConfig:
    label: str
    keywords: list[str]
    exclude_keywords: list[str] = field(default_factory=list)
    expected_latest_period_contains: str | None = None


@dataclass(frozen=True)
class DimensionCadenceConfig:
    name: str
    reason: str
    to_reach_10: str
    keywords: list[str] = field(default_factory=list)
    exclude_keywords: list[str] = field(default_factory=list)
    expected_latest_period_contains: str | None = None
    sub_series: list[SubSeriesConfig] = field(default_factory=list)


@dataclass(frozen=True)
class DeudaCadenceConfig:
    dimension_name: str
    last_period_label: str
    last_period_end: str  # ISO "YYYY-MM-DD"
    last_figure_ars: float
    last_figure_label: str
    ordenanza_ref: str
    ordenanza_article: str
    ordenanza_note: str
    source_ref: str  # mcr-docs/<slug> manifest id of the last-published PDF


@dataclass(frozen=True)
class CadenciaConfig:
    asap_report: str
    asap_cutoff_label: str
    killer_fact: str
    killer_fact_source_ref: str
    dimensions: list[DimensionCadenceConfig]
    deuda: DeudaCadenceConfig
    source_refs: list[str]


def load_curated_cadencia(path: Path) -> CadenciaConfig:
    """Load the curated cadence overlay (see module docstring)."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))

    dimensions = []
    for d in raw["dimensions"]:
        sub_series = [
            SubSeriesConfig(
                label=s["label"],
                keywords=list(s.get("keywords") or []),
                exclude_keywords=list(s.get("exclude_keywords") or []),
                expected_latest_period_contains=s.get("expected_latest_period_contains"),
            )
            for s in d.get("sub_series") or []
        ]
        dimensions.append(
            DimensionCadenceConfig(
                name=d["name"],
                reason=d["reason"],
                to_reach_10=d["to_reach_10"],
                keywords=list(d.get("keywords") or []),
                exclude_keywords=list(d.get("exclude_keywords") or []),
                expected_latest_period_contains=d.get("expected_latest_period_contains"),
                sub_series=sub_series,
            )
        )

    deuda_raw = raw["deuda"]
    deuda = DeudaCadenceConfig(
        dimension_name=deuda_raw["dimension_name"],
        last_period_label=deuda_raw["last_period_label"],
        last_period_end=deuda_raw["last_period_end"],
        last_figure_ars=float(deuda_raw["last_figure_ars"]),
        last_figure_label=deuda_raw["last_figure_label"],
        ordenanza_ref=deuda_raw["ordenanza_ref"],
        ordenanza_article=deuda_raw["ordenanza_article"],
        ordenanza_note=deuda_raw["ordenanza_note"],
        source_ref=deuda_raw["source_ref"],
    )

    return CadenciaConfig(
        asap_report=raw["asap_report"],
        asap_cutoff_label=raw["asap_cutoff_label"],
        killer_fact=raw["killer_fact"],
        killer_fact_source_ref=raw["killer_fact_source_ref"],
        dimensions=dimensions,
        deuda=deuda,
        source_refs=list(raw.get("source_refs") or []),
    )


def _source_ref_for(doc: dict[str, Any]) -> str:
    return f"mcr-docs/{doc['slug']}"


def _check_no_drift(
    *, dimension_label: str, doc: dict[str, Any] | None, expected_contains: str | None
) -> None:
    if doc is None or expected_contains is None:
        return
    if expected_contains not in doc["title"]["rendered"]:
        raise ValueError(
            f"cadencia live-drift tripwire: {dimension_label!r} freshest live document "
            f"is now {doc['title']['rendered']!r} ({doc['slug']}), which no longer "
            f"contains the expected marker {expected_contains!r} the curated reason/"
            "to_reach_10 prose describes -- re-curate etl/cadencia.yaml before shipping."
        )


def derive_dimension_cadence(
    dim_config: DimensionCadenceConfig,
    documentos: list[dict[str, Any]],
    asap_dims_by_name: dict[str, tuple[float, float]],
    *,
    now: datetime,
) -> dict[str, Any]:
    """Derive one dimension's live cadence entry for `data/cadencia.json`.

    ``asap_dims_by_name`` maps dimension name -> (got, max), read from the
    curated ASAP score (single source of truth for those two numbers).
    """
    if dim_config.name not in asap_dims_by_name:
        raise ValueError(
            f"cadencia config error: dimension {dim_config.name!r} has no matching "
            "entry in the curated ASAP score (etl/asap_transparencia.yaml) -- "
            "every cadencia dimension name must match an ASAP dimension name exactly."
        )
    got, max_ = asap_dims_by_name[dim_config.name]

    if dim_config.sub_series:
        matches: list[tuple[SubSeriesConfig, dict[str, Any] | None]] = []
        for sub in dim_config.sub_series:
            doc = latest_matching(documentos, sub.keywords, sub.exclude_keywords)
            _check_no_drift(
                dimension_label=f"{dim_config.name} / {sub.label}",
                doc=doc,
                expected_contains=sub.expected_latest_period_contains,
            )
            matches.append((sub, doc))

        found = [(sub, doc) for sub, doc in matches if doc is not None]
        if not found:
            last_period_published = None
            last_published_at = None
            lag_months = None
            source_refs: list[str] = []
        else:
            last_period_published = " · ".join(
                f"{sub.label}: {doc['title']['rendered']}" for sub, doc in found
            )
            dates = [_parse_wp_date(doc["date"]) for _, doc in found]
            oldest = min(dates)
            last_published_at = oldest.strftime("%Y-%m-%dT%H:%M:%S")
            lag_months = months_between(oldest, now)
            source_refs = [_source_ref_for(doc) for _, doc in found]
    elif dim_config.keywords:
        doc = latest_matching(documentos, dim_config.keywords, dim_config.exclude_keywords)
        _check_no_drift(
            dimension_label=dim_config.name,
            doc=doc,
            expected_contains=dim_config.expected_latest_period_contains,
        )
        if doc is None:
            last_period_published = None
            last_published_at = None
            lag_months = None
            source_refs = []
        else:
            last_period_published = doc["title"]["rendered"]
            published_at = _parse_wp_date(doc["date"])
            last_published_at = published_at.strftime("%Y-%m-%dT%H:%M:%S")
            lag_months = months_between(published_at, now)
            source_refs = [_source_ref_for(doc)]
    else:
        # No document series backs this dimension (e.g. "Acceso web") --
        # never fabricate a period/lag for it.
        last_period_published = None
        last_published_at = None
        lag_months = None
        source_refs = []

    caught_up = lag_months is not None and lag_months <= CAUGHT_UP_LAG_MONTHS_TOLERANCE

    return {
        "name": dim_config.name,
        "got": got,
        "max": max_,
        "lastPeriodPublished": last_period_published,
        "lastPublishedAt": last_published_at,
        "lagMonths": lag_months,
        "caughtUp": caught_up,
        "reason": dim_config.reason,
        "toReach10": dim_config.to_reach_10,
        "sourceRefs": source_refs,
    }


_QUARTER_END_MONTHS = (3, 6, 9, 12)


def _next_quarter_end(after: datetime) -> datetime:
    """The next calendar quarter-end date strictly after ``after`` (UTC midnight)."""
    for month in _QUARTER_END_MONTHS:
        last_day = _last_day(after.year, month)
        if month > after.month or (month == after.month and after.day < last_day):
            return datetime(after.year, month, last_day, tzinfo=UTC)
    return datetime(after.year + 1, 3, 31, tzinfo=UTC)


def _last_day(year: int, month: int) -> int:
    if month == 12:
        return 31
    next_month_first = datetime(year, month + 1, 1, tzinfo=UTC)
    return (next_month_first - _timedelta(days=1)).day


def derive_deuda_cadence(
    deuda_config: DeudaCadenceConfig,
    documentos: list[dict[str, Any]],
    *,
    now: datetime,
) -> dict[str, Any]:
    """Derive the deuda-counter block, cross-checking the curated figure
    against the live listing (tripwire: fails loudly if the municipality
    has published a stock-de-deuda document more recent than the one the
    curated figure/period describes).
    """
    live_doc = latest_matching(documentos, ["stock de deuda"])
    curated_slug = deuda_config.source_ref.split("/", 1)[1]
    if live_doc is not None and live_doc["slug"] != curated_slug:
        raise ValueError(
            "cadencia live-drift tripwire: a stock-de-deuda document more recent than "
            f"the curated one ({curated_slug!r}) is now live -- {live_doc['slug']!r} "
            f"({live_doc['title']['rendered']!r}). re-curate etl/cadencia.yaml's `deuda` "
            "block (last_period_label/last_period_end/last_figure_ars/source_ref) from "
            "the new document before shipping."
        )

    period_end = datetime.fromisoformat(deuda_config.last_period_end).replace(tzinfo=UTC)
    now_utc = now if now.tzinfo else now.replace(tzinfo=UTC)
    elapsed_days = (now_utc.date() - period_end.date()).days

    quarters_missing = 0
    candidate_end = period_end
    while True:
        candidate_end = _next_quarter_end(candidate_end)
        if candidate_end > now_utc:
            break
        quarters_missing += 1

    return {
        "lastPeriod": deuda_config.last_period_label,
        "lastPeriodEnd": deuda_config.last_period_end,
        "lastFigureArs": deuda_config.last_figure_ars,
        "lastFigureLabel": deuda_config.last_figure_label,
        "quartersMissing": quarters_missing,
        "elapsedDays": elapsed_days,
        "ordenanzaRef": deuda_config.ordenanza_ref,
        "ordenanzaArticle": deuda_config.ordenanza_article,
        "ordenanzaNote": deuda_config.ordenanza_note,
        "sourceRefs": [deuda_config.source_ref],
    }


def assert_honest_cadencia(dimensions: list[dict[str, Any]], expected_total: float) -> None:
    """Same honesty guarantee as `transparencia.assert_honest`: the derived
    dimensions must sum to the ASAP headline total, and no dimension may
    claim more than its own max. Raises loudly rather than silently
    correcting or dropping data.
    """
    dimension_sum = sum(d["got"] for d in dimensions)
    if dimension_sum != expected_total:
        raise ValueError(
            "cadencia honesty check failed: dimensions sum to "
            f"{dimension_sum}, expected total {expected_total}"
        )
    for d in dimensions:
        if d["got"] > d["max"]:
            raise ValueError(
                f"cadencia honesty check failed: dimension {d.get('name')!r} got "
                f"{d['got']} exceeds its own max {d['max']}"
            )


def build_cadencia(
    manifest_path: Path,
    cadencia_curated_path: Path,
    asap_curated_path: Path,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the full `data/cadencia.json` payload.

    Reads the live wp-json documentos snapshot via the manifest (must have
    been archived first via `etl archive --capability mcr-docs-snapshot`),
    the curated cadence overlay (`etl/cadencia.yaml`), and the curated ASAP
    score (`etl/asap_transparencia.yaml`, single source of truth for
    `got`/`max`). Runs `assert_honest_cadencia` before returning anything.
    """
    import json

    documentos_path = resolve_archived_path(manifest_path, DOCUMENTOS_SNAPSHOT_MANIFEST_ID)
    documentos = json.loads(documentos_path.read_text(encoding="utf-8"))

    config = load_curated_cadencia(cadencia_curated_path)
    asap_score = load_curated_transparencia(asap_curated_path)
    asap_dims_by_name = {d.name: (d.got, d.max) for d in asap_score.dimensions}

    resolved_now = now or datetime.now(UTC)

    dimensions = [
        derive_dimension_cadence(dim_config, documentos, asap_dims_by_name, now=resolved_now)
        for dim_config in config.dimensions
    ]
    assert_honest_cadencia(dimensions, expected_total=asap_score.total)

    deuda = derive_deuda_cadence(config.deuda, documentos, now=resolved_now)

    source_refs = sorted(
        {
            *config.source_refs,
            config.deuda.source_ref,
            *(ref for dim in dimensions for ref in dim["sourceRefs"]),
        }
    )

    return {
        "generatedAt": resolved_now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "asapReport": config.asap_report,
        "asapCutoffLabel": config.asap_cutoff_label,
        "killerFact": config.killer_fact,
        "killerFactSourceRef": config.killer_fact_source_ref,
        "dimensions": dimensions,
        "deuda": deuda,
        "sourceRefs": source_refs,
    }
