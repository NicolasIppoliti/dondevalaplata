"""Tests for the dependency-free etl/.env loader used by local archive/sync-r2."""

from __future__ import annotations

from pathlib import Path

from etl.cli import _load_env_file


def test_load_env_sets_missing_keys(tmp_path: Path, monkeypatch) -> None:
    env = tmp_path / ".env"
    env.write_text(
        "# a comment\n"
        "R2_ACCOUNT_ID=acc123\n"
        'R2_BUCKET="rosales-archivo"\n'
        "\n"
        "EMPTY=\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("R2_ACCOUNT_ID", raising=False)
    monkeypatch.delenv("R2_BUCKET", raising=False)

    _load_env_file(env)

    import os

    assert os.environ["R2_ACCOUNT_ID"] == "acc123"
    assert os.environ["R2_BUCKET"] == "rosales-archivo"  # quotes stripped
    assert os.environ["EMPTY"] == ""


def test_load_env_never_overwrites_existing(tmp_path: Path, monkeypatch) -> None:
    env = tmp_path / ".env"
    env.write_text("R2_ACCOUNT_ID=from_file\n", encoding="utf-8")
    monkeypatch.setenv("R2_ACCOUNT_ID", "from_ci")

    _load_env_file(env)

    import os

    assert os.environ["R2_ACCOUNT_ID"] == "from_ci"


def test_load_env_missing_file_is_noop(tmp_path: Path) -> None:
    _load_env_file(tmp_path / "does-not-exist.env")  # must not raise
