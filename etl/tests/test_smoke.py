"""Smoke test confirming the pytest runner is wired up correctly."""

from etl import __version__


def test_package_importable() -> None:
    assert __version__ == "0.1.0"


def test_runner_smoke() -> None:
    assert 1 + 1 == 2
