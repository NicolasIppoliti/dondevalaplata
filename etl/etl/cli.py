"""Command-line interface for the ETL pipeline.

Subcommands:
  archive               Fetch and archive every configured source (network I/O).
  build-ipc             Rebase the INDEC IPC series to constant pesos.
  build-coparticipacion Build the coparticipacion display JSON from the archive.
  build-fallos          Build the HTC fallos display JSON from the archive.
  build                 Run all build-* steps in sequence.

Only ``archive`` performs network I/O. Every ``build-*`` command is
deterministic and reads exclusively from the local archive, which makes it
safe to run offline and to unit test in isolation.
"""

from __future__ import annotations

import argparse
from collections.abc import Sequence
from pathlib import Path

from .archive import Fetcher, run_archive_all
from .config import load_sources
from .http_client import RequestsFetcher
from .mcr_docs import discover_documentos
from .mcr_docs import to_source_entries as mcr_docs_to_entries
from .r2 import R2Store
from .sibom import discover_bulletins
from .sibom import to_source_entries as sibom_to_entries

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_SOURCES_PATH = REPO_ROOT / "etl" / "sources.yaml"
DEFAULT_MANIFEST_PATH = REPO_ROOT / "archive-manifest.json"
DEFAULT_ARCHIVE_ROOT = REPO_ROOT / "archive"

# From Nº31 (2023) onward, per design D4/tasks Slice 2 scope note.
SIBOM_FROM_NUMBER = 31


def discover_dynamic_sources(fetcher: Fetcher) -> dict[str, list[dict]]:
    """Discover the source families that are enumerated live, not hardcoded.

    SIBOM (bulletins) and mcr-docs (Gobierno Abierto PDFs) are F0-archival-only
    in this MVP: every entry gets a manifest record, but neither family is
    parsed into `data/*.json` or a route in the F1 UI (deferred to F2/F3).
    """
    bulletins = discover_bulletins(fetcher, from_number=SIBOM_FROM_NUMBER)
    documentos = discover_documentos(fetcher)
    return {
        "sibom": sibom_to_entries(bulletins),
        "mcr-docs": mcr_docs_to_entries(documentos),
    }


# Dynamically discovered, bulk source families: their reachability is
# already proven by the listing/enumeration fetch itself (SIBOM listing
# HTML, mcr-docs wp-json), and per-item HEAD checks are unreliable for at
# least SIBOM (observed to hang rather than respond). Summarize instead
# of hammering every individual PDF twice before the real archive run.
_BULK_DYNAMIC_CAPABILITIES = frozenset({"sibom", "mcr-docs"})


def _reachability_report(sources: dict[str, list[dict]], fetcher: Fetcher) -> list[str]:
    """Best-effort HEAD per static source, without downloading or writing anything."""
    lines = []
    for capability, entries in sources.items():
        if capability in _BULK_DYNAMIC_CAPABILITIES:
            lines.append(
                f"[{capability}] {len(entries)} entries discovered "
                "(reachability proven by the listing fetch itself)"
            )
            continue
        for entry in entries:
            try:
                response = fetcher.head(
                    entry["source_url"],
                    timeout=entry.get("timeout", 15),
                    headers={"User-Agent": "PortalTransparenciaCoronelRosales/1.0 (dry-run)"},
                )
                status = "OK" if response.status_code < 400 else f"HTTP {response.status_code}"
            except Exception as exc:  # network error, DNS failure, timeout, etc.
                status = f"ERROR: {exc}"
            lines.append(f"[{capability}] {entry['id']}: {status}")
    return lines


def run_archive(args: argparse.Namespace) -> int:
    """Fetch and archive every configured source (static + dynamically discovered).

    ``args.capabilities``, when set, scopes the run to only those
    capability keys -- useful to archive one source family at a time
    (e.g. for a per-family commit, or to bound a single run's duration).
    """
    fetcher: Fetcher = RequestsFetcher()
    capabilities = getattr(args, "capabilities", None)
    sources = load_sources(args.sources_path)
    if not capabilities or _BULK_DYNAMIC_CAPABILITIES.intersection(capabilities):
        sources.update(discover_dynamic_sources(fetcher))

    if capabilities:
        sources = {k: v for k, v in sources.items() if k in capabilities}

    if args.dry_run:
        for line in _reachability_report(sources, fetcher):
            print(line)
        return 0

    r2_store = R2Store.from_env()
    if r2_store is None:
        print(
            "etl archive: R2 credentials not configured (see etl/.env.example) "
            "-- archiving locally only, R2 upload pending for a future run."
        )

    records = run_archive_all(
        sources,
        fetcher=fetcher,
        local_root=args.archive_root,
        manifest_path=args.manifest_path,
        r2_store=r2_store,
    )
    ok = sum(1 for r in records if r["status"] == "ok")
    errors = sum(1 for r in records if r["status"] == "error")
    print(f"etl archive: {ok} ok, {errors} error, {len(records)} total records")
    return 0


def run_build_ipc(args: argparse.Namespace) -> int:
    """Rebase the INDEC IPC series to constant pesos. Not yet implemented."""
    print("etl build-ipc: not implemented yet (see Slice 3)")
    return 1


def run_build_coparticipacion(args: argparse.Namespace) -> int:
    """Build the coparticipacion display JSON. Not yet implemented."""
    print("etl build-coparticipacion: not implemented yet (see Slice 3)")
    return 1


def run_build_fallos(args: argparse.Namespace) -> int:
    """Build the HTC fallos display JSON. Not yet implemented."""
    print("etl build-fallos: not implemented yet (see Slice 3)")
    return 1


def run_build(args: argparse.Namespace) -> int:
    """Run all build-* steps in sequence. Not yet implemented."""
    print("etl build: not implemented yet (see Slice 3)")
    return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="etl",
        description=(
            "Archival and build pipeline for the Portal de Transparencia "
            "de Coronel Rosales."
        ),
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    archive_parser = subparsers.add_parser(
        "archive", help="Fetch and archive every configured source."
    )
    archive_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate configuration and reachability without writing to the archive.",
    )
    archive_parser.add_argument(
        "--sources-path", type=Path, default=DEFAULT_SOURCES_PATH,
    )
    archive_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    archive_parser.add_argument(
        "--archive-root", type=Path, default=DEFAULT_ARCHIVE_ROOT,
    )
    archive_parser.add_argument(
        "--capability",
        dest="capabilities",
        action="append",
        help=(
            "Scope the run to one capability (repeatable). "
            "Defaults to every capability in sources.yaml plus SIBOM/mcr-docs."
        ),
    )
    archive_parser.set_defaults(func=run_archive)

    build_ipc_parser = subparsers.add_parser(
        "build-ipc", help="Rebase the INDEC IPC series to constant pesos."
    )
    build_ipc_parser.set_defaults(func=run_build_ipc)

    build_coparticipacion_parser = subparsers.add_parser(
        "build-coparticipacion",
        help="Build the coparticipacion display JSON from the archive.",
    )
    build_coparticipacion_parser.set_defaults(func=run_build_coparticipacion)

    build_fallos_parser = subparsers.add_parser(
        "build-fallos", help="Build the HTC fallos display JSON from the archive."
    )
    build_fallos_parser.set_defaults(func=run_build_fallos)

    build_parser_cmd = subparsers.add_parser(
        "build", help="Run all build-* steps in sequence."
    )
    build_parser_cmd.set_defaults(func=run_build)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)
