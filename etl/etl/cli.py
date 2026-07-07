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

import argparse
from collections.abc import Sequence


def run_archive(args: argparse.Namespace) -> int:
    """Fetch and archive every configured source. Not yet implemented."""
    print("etl archive: not implemented yet (see Slice 2)")
    return 1


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
