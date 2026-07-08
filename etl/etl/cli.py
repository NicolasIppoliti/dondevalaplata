"""Command-line interface for the ETL pipeline.

Subcommands:
  archive               Fetch and archive every configured source (network I/O).
  sync-r2               Backfill R2 uploads for local archive files missing archived_url.
  build-ipc             Rebase the INDEC IPC series to constant pesos.
  build-coparticipacion Build the coparticipacion display JSON from the archive.
  build-fallos          Build the HTC fallos display JSON from the archive.
  build-transparencia   Build the ASAP transparency-score display JSON from the curated source.
  build-cadencia        Build the live ASAP publication-cadence + deuda counter display JSON.
  build-gasto-partida   Build the RAFAM gasto-por-partida explorer display JSON from the archive.
  build-adjudicaciones  Build the SIBOM adjudicaciones + proveedores padrón JSON from the archive.
  build-deuda-historica Build the deuda pública histórica quarterly series JSON from the archive.
  build-novedades       Build the watchdog "novedades" publication-behavior log JSON.
  build-poblacion       Build the Censo 2022 population-per-municipio display JSON.
  build                 Run all build-* steps in sequence.

``archive`` and ``sync-r2`` are the only commands that perform network I/O
(the latter uploads to R2 only, never re-fetches from the origin). Every
``build-*`` command is deterministic and reads exclusively from the local
archive, which makes it safe to run offline and to unit test in isolation.
"""

from __future__ import annotations

import argparse
import json
from collections.abc import Sequence
from pathlib import Path

from .archive import Fetcher, run_archive_all
from .cadencia import build_cadencia
from .config import load_sources
from .coparticipacion import COPARTICIPACION_CSV_MANIFEST_ID, build_coparticipacion
from .deuda_historica import build_deuda_historica
from .fallos import build_fallos
from .gasto_partida import build_gasto_partida
from .http_client import RequestsFetcher
from .ipc import build_ipc, rebased_series_from_json
from .manifest import load_manifest, save_manifest
from .mcr_docs import discover_documentos
from .mcr_docs import to_source_entries as mcr_docs_to_entries
from .novedades import build_novedades
from .poblacion import build_poblacion_censo_2022
from .r2 import R2Store
from .r2_sync import sync_archived_to_r2
from .sibom import discover_bulletins, discover_sibom_actos
from .sibom import to_source_entries as sibom_to_entries
from .sibom_adjudicaciones import build_adjudicaciones, build_proveedores
from .storage import LocalArchiveStore
from .transparencia import build_transparencia

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_SOURCES_PATH = REPO_ROOT / "etl" / "sources.yaml"
DEFAULT_MANIFEST_PATH = REPO_ROOT / "archive-manifest.json"
DEFAULT_ARCHIVE_ROOT = REPO_ROOT / "archive"
DEFAULT_DATA_ROOT = REPO_ROOT / "data"
DEFAULT_FICHA_2022_PATH = REPO_ROOT / "etl" / "fallos_ficha_2022.yaml"
DEFAULT_TRANSPARENCIA_CURATED_PATH = REPO_ROOT / "etl" / "asap_transparencia.yaml"
DEFAULT_CADENCIA_CURATED_PATH = REPO_ROOT / "etl" / "cadencia.yaml"
DEFAULT_NOVEDADES_SEED_PATH = REPO_ROOT / "etl" / "novedades_seed.yaml"

# From Nº31 (2023) onward, per design D4/tasks Slice 2 scope note.
SIBOM_FROM_NUMBER = 31


def discover_dynamic_sources(
    fetcher: Fetcher, *, manifest_path: Path
) -> dict[str, list[dict]]:
    """Discover the source families that are enumerated live, not hardcoded.

    SIBOM bulletins and mcr-docs (Gobierno Abierto PDFs) are F0-archival-only
    in this MVP: every entry gets a manifest record, but neither family is
    parsed into `data/*.json` or a route in the F1 UI.

    SIBOM adjudicación acts (``sibom-actos``, feature G3) are different: they
    are discovered by parsing the ALREADY-ARCHIVED SIBOM bulletin PDFs
    offline (see ``sibom.discover_sibom_actos``) and only fetch a bulletin's
    lightweight listing page when that bulletin actually contains a
    candidate adjudicación decree -- reusing the F0 bulletin archive rather
    than duplicating it, and never hammering SIBOM for the (large) majority
    of acts that are not adjudicaciones.
    """
    bulletins = discover_bulletins(fetcher, from_number=SIBOM_FROM_NUMBER)
    documentos = discover_documentos(fetcher)
    return {
        "sibom": sibom_to_entries(bulletins),
        "mcr-docs": mcr_docs_to_entries(documentos),
        "sibom-actos": discover_sibom_actos(fetcher, manifest_path=manifest_path),
    }


# Dynamically discovered, bulk source families: their reachability is
# already proven by the listing/enumeration fetch itself (SIBOM listing
# HTML, mcr-docs wp-json), and per-item HEAD checks are unreliable for at
# least SIBOM (observed to hang rather than respond). Summarize instead
# of hammering every individual PDF twice before the real archive run.
_BULK_DYNAMIC_CAPABILITIES = frozenset({"sibom", "mcr-docs", "sibom-actos"})


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
        sources.update(discover_dynamic_sources(fetcher, manifest_path=args.manifest_path))

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


def run_sync_r2(args: argparse.Namespace) -> int:
    """Backfill R2 uploads for locally-archived records missing `archived_url`.

    Unlike `archive`, this never re-fetches from the origin: it only
    uploads files already present under `archive/` (see `r2_sync.py`).
    Useful when files were archived before R2 credentials were configured.
    """
    r2_store = R2Store.from_env()
    if r2_store is None:
        print(
            "etl sync-r2: R2 credentials not configured (see etl/.env.example) "
            "-- nothing to sync."
        )
        return 1

    local_store = LocalArchiveStore(root=args.archive_root)
    records = load_manifest(args.manifest_path)
    updated = sync_archived_to_r2(records, local_store=local_store, r2_store=r2_store)
    save_manifest(args.manifest_path, updated)

    uploaded = sum(
        1
        for old, new in zip(records, updated, strict=True)
        if not old.get("archived_url") and new.get("archived_url")
    )
    print(f"etl sync-r2: {uploaded} file(s) uploaded, {len(updated)} total records")
    return 0


def run_build_ipc(args: argparse.Namespace) -> int:
    """Rebase the INDEC IPC series to constant pesos, writing `data/ipc/ipc-nacional.json`."""
    result = build_ipc(args.manifest_path)
    output_path = args.data_root / "ipc" / "ipc-nacional.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output_path.write_text(payload, encoding="utf-8")
    print(f"etl build-ipc: wrote {output_path} (base month {result['baseMonth']})")
    return 0


def run_build_coparticipacion(args: argparse.Namespace) -> int:
    """Build `data/coparticipacion.json` from the archived CSV + pinned IPC series.

    Reads the CSV path from the manifest (rather than hardcoding it) and
    the rebased IPC series from `data/ipc/ipc-nacional.json` (must be
    built first via `etl build-ipc` -- the pinned, versioned artifact
    per design D5, not recomputed from the raw archive here).
    """
    records = load_manifest(args.manifest_path)
    record = next(r for r in records if r["id"] == COPARTICIPACION_CSV_MANIFEST_ID)
    csv_path = args.manifest_path.parent / record["archived_path"]

    ipc_path = args.data_root / "ipc" / "ipc-nacional.json"
    ipc_payload = json.loads(ipc_path.read_text(encoding="utf-8"))
    ipc = rebased_series_from_json(ipc_payload)

    result = build_coparticipacion(csv_path, ipc)

    output_path = args.data_root / "coparticipacion.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output_path.write_text(payload, encoding="utf-8")
    print(f"etl build-coparticipacion: wrote {output_path} (data through {result['dataThrough']})")
    return 0


def run_build_fallos(args: argparse.Namespace) -> int:
    """Build `data/fallos.json` from the archived text-layer PDFs + curated 2022 ficha."""
    result = build_fallos(args.manifest_path, args.ficha_2022_path)
    output_path = args.data_root / "fallos.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output_path.write_text(payload, encoding="utf-8")
    print(f"etl build-fallos: wrote {output_path} ({len(result['records'])} records)")
    return 0


def run_build_transparencia(args: argparse.Namespace) -> int:
    """Build `data/transparencia.json` from the curated ASAP score.

    Reads `etl/asap_transparencia.yaml` by default (see --curated-path).
    """
    result = build_transparencia(args.curated_path)
    output_path = args.data_root / "transparencia.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output_path.write_text(payload, encoding="utf-8")
    print(
        f"etl build-transparencia: wrote {output_path} "
        f"(total {result['total']}/{result['max']})"
    )
    return 0


def run_build_cadencia(args: argparse.Namespace) -> int:
    """Build `data/cadencia.json`: live ASAP publication-cadence dashboard + deuda counter.

    Reads the live wp-json documentos snapshot via the manifest (must be
    archived first via `etl archive --capability mcr-docs-snapshot`), the
    curated cadence overlay (`etl/cadencia.yaml`), and the curated ASAP
    score (`etl/asap_transparencia.yaml`, single source of truth for
    got/max).
    """
    result = build_cadencia(args.manifest_path, args.cadencia_curated_path, args.asap_curated_path)
    output_path = args.data_root / "cadencia.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output_path.write_text(payload, encoding="utf-8")
    print(f"etl build-cadencia: wrote {output_path}")
    return 0


def run_build_gasto_partida(args: argparse.Namespace) -> int:
    """Build `data/gasto-partida.json`: the RAFAM gasto-por-partida explorer tree.

    Reads the archived RAFAM "Estado de Ejecución del Presupuesto de Gastos"
    PDF via the manifest. HONESTY GATE: `build_gasto_partida` raises if the
    parsed leaf partidas do not reconcile against the PDF's own "TOTALES
    GENERALES" row -- this command propagates that as a non-zero exit and
    writes NO file, rather than shipping a partially-wrong build artifact.
    """
    try:
        result = build_gasto_partida(args.manifest_path)
    except ValueError as exc:
        print(f"etl build-gasto-partida: FAILED -- {exc}")
        return 1
    output_path = args.data_root / "gasto-partida.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output_path.write_text(payload, encoding="utf-8")
    leaf_count = result.get("reconciliation", {}).get("leafCount", "?")
    print(f"etl build-gasto-partida: wrote {output_path} ({leaf_count} leaf partidas, reconciled)")
    return 0


def run_build_adjudicaciones(args: argparse.Namespace) -> int:
    """Build `data/adjudicaciones.json` and `data/proveedores.json`: the
    SIBOM adjudicaciones monitor + reconstructed proveedores padrón
    (feature G3). Network-free -- reads exclusively from the local archive
    (`sibom` bulletin PDFs + `sibom-actos` individual act HTML pages, see
    `etl archive --capability sibom-actos`).
    """
    result = build_adjudicaciones(args.manifest_path)
    adjudicaciones_path = args.data_root / "adjudicaciones.json"
    adjudicaciones_path.parent.mkdir(parents=True, exist_ok=True)
    adjudicaciones_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    proveedores = build_proveedores(result["records"])
    proveedores_path = args.data_root / "proveedores.json"
    proveedores_path.write_text(
        json.dumps(proveedores, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(
        f"etl build-adjudicaciones: wrote {adjudicaciones_path} "
        f"({len(result['records'])} rows, {result['skippedCount']} actos skipped, "
        f"window {result['windowFrom']}..{result['windowTo']}) "
        f"and {proveedores_path} ({len(proveedores['proveedores'])} proveedores)"
    )
    return 0


def run_build_deuda_historica(args: argparse.Namespace) -> int:
    """Build `data/deuda-historica.json`: the quarterly deuda pública
    histórica series (feature H2a), parsed from the three archived
    "Stock de Deuda y Perfil de Vencimientos" PDFs. See
    `etl.deuda_historica`'s module docstring for the deliberate decision to
    publish only the reconciled headline total per quarter, never a
    composition breakdown it cannot verify.
    """
    result = build_deuda_historica(args.manifest_path)
    output_path = args.data_root / "deuda-historica.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output_path.write_text(payload, encoding="utf-8")
    print(f"etl build-deuda-historica: wrote {output_path} ({len(result['series'])} quarters)")
    return 0


def run_build_novedades(args: argparse.Namespace) -> int:
    """Build `data/novedades.json`: the watchdog "novedades" publication-
    behavior log (feature H2b). Reads the PREVIOUS `data/novedades.json`
    (if any) so `auto-detected` publish events accumulate across monthly
    cron runs instead of being recomputed from scratch -- see
    `etl.novedades`'s module docstring for the three event kinds and their
    per-kind append/replace rules.
    """
    output_path = args.data_root / "novedades.json"
    previous_novedades = None
    if output_path.exists():
        previous_novedades = json.loads(output_path.read_text(encoding="utf-8"))

    result = build_novedades(
        args.manifest_path,
        args.cadencia_path,
        args.novedades_seed_path,
        previous_novedades=previous_novedades,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output_path.write_text(payload, encoding="utf-8")
    print(f"etl build-novedades: wrote {output_path} ({len(result['events'])} events)")
    return 0


def run_build_poblacion(args: argparse.Namespace) -> int:
    """Build `data/poblacion-censo-2022.json`: the Censo 2022 population
    figure per target municipio (feature H3a), the sourced denominator for
    the `/coparticipacion` per-cápita comparison. HONESTY GATE:
    `build_poblacion_censo_2022` raises if any of the four target
    municipios is missing a population figure -- this command propagates
    that as a non-zero exit and writes NO file, rather than shipping a
    partial per-cápita source.
    """
    try:
        result = build_poblacion_censo_2022(args.manifest_path)
    except ValueError as exc:
        print(f"etl build-poblacion: FAILED -- {exc}")
        return 1
    output_path = args.data_root / "poblacion-censo-2022.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output_path.write_text(payload, encoding="utf-8")
    print(f"etl build-poblacion: wrote {output_path} ({len(result['municipios'])} municipios)")
    return 0


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

    sync_r2_parser = subparsers.add_parser(
        "sync-r2",
        help="Backfill R2 uploads for locally-archived records missing archived_url.",
    )
    sync_r2_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    sync_r2_parser.add_argument(
        "--archive-root", type=Path, default=DEFAULT_ARCHIVE_ROOT,
    )
    sync_r2_parser.set_defaults(func=run_sync_r2)

    build_ipc_parser = subparsers.add_parser(
        "build-ipc", help="Rebase the INDEC IPC series to constant pesos."
    )
    build_ipc_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    build_ipc_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_ipc_parser.set_defaults(func=run_build_ipc)

    build_coparticipacion_parser = subparsers.add_parser(
        "build-coparticipacion",
        help="Build the coparticipacion display JSON from the archive.",
    )
    build_coparticipacion_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    build_coparticipacion_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_coparticipacion_parser.set_defaults(func=run_build_coparticipacion)

    build_fallos_parser = subparsers.add_parser(
        "build-fallos", help="Build the HTC fallos display JSON from the archive."
    )
    build_fallos_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    build_fallos_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_fallos_parser.add_argument(
        "--ficha-2022-path", type=Path, default=DEFAULT_FICHA_2022_PATH,
    )
    build_fallos_parser.set_defaults(func=run_build_fallos)

    build_transparencia_parser = subparsers.add_parser(
        "build-transparencia",
        help="Build the ASAP transparency-score display JSON from the curated source.",
    )
    build_transparencia_parser.add_argument(
        "--curated-path", type=Path, default=DEFAULT_TRANSPARENCIA_CURATED_PATH,
    )
    build_transparencia_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_transparencia_parser.set_defaults(func=run_build_transparencia)

    build_cadencia_parser = subparsers.add_parser(
        "build-cadencia",
        help="Build the live ASAP publication-cadence + deuda counter display JSON.",
    )
    build_cadencia_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    build_cadencia_parser.add_argument(
        "--cadencia-curated-path", type=Path, default=DEFAULT_CADENCIA_CURATED_PATH,
    )
    build_cadencia_parser.add_argument(
        "--asap-curated-path", type=Path, default=DEFAULT_TRANSPARENCIA_CURATED_PATH,
    )
    build_cadencia_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_cadencia_parser.set_defaults(func=run_build_cadencia)

    build_gasto_partida_parser = subparsers.add_parser(
        "build-gasto-partida",
        help="Build the RAFAM gasto-por-partida explorer display JSON from the archive.",
    )
    build_gasto_partida_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    build_gasto_partida_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_gasto_partida_parser.set_defaults(func=run_build_gasto_partida)

    build_adjudicaciones_parser = subparsers.add_parser(
        "build-adjudicaciones",
        help="Build the SIBOM adjudicaciones + proveedores padrón display JSON from the archive.",
    )
    build_adjudicaciones_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    build_adjudicaciones_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_adjudicaciones_parser.set_defaults(func=run_build_adjudicaciones)

    build_deuda_historica_parser = subparsers.add_parser(
        "build-deuda-historica",
        help="Build the deuda pública histórica quarterly series display JSON from the archive.",
    )
    build_deuda_historica_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    build_deuda_historica_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_deuda_historica_parser.set_defaults(func=run_build_deuda_historica)

    build_novedades_parser = subparsers.add_parser(
        "build-novedades",
        help="Build the watchdog \"novedades\" publication-behavior log JSON.",
    )
    build_novedades_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    build_novedades_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_novedades_parser.add_argument(
        "--cadencia-path", type=Path, default=DEFAULT_DATA_ROOT / "cadencia.json",
    )
    build_novedades_parser.add_argument(
        "--novedades-seed-path", type=Path, default=DEFAULT_NOVEDADES_SEED_PATH,
    )
    build_novedades_parser.set_defaults(func=run_build_novedades)

    build_poblacion_parser = subparsers.add_parser(
        "build-poblacion",
        help="Build the Censo 2022 population-per-municipio display JSON from the archive.",
    )
    build_poblacion_parser.add_argument(
        "--manifest-path", type=Path, default=DEFAULT_MANIFEST_PATH,
    )
    build_poblacion_parser.add_argument(
        "--data-root", type=Path, default=DEFAULT_DATA_ROOT,
    )
    build_poblacion_parser.set_defaults(func=run_build_poblacion)

    build_parser_cmd = subparsers.add_parser(
        "build", help="Run all build-* steps in sequence."
    )
    build_parser_cmd.set_defaults(func=run_build)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)
