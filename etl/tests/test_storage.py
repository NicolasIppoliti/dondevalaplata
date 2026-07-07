"""Unit tests for the local archive storage seam (etl.storage)."""

from etl.storage import LocalArchiveStore, sha256_of


def test_sha256_of_known_value() -> None:
    assert sha256_of(b"hello") == (
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    )


def test_write_creates_file_under_capability_dir(tmp_path) -> None:
    store = LocalArchiveStore(root=tmp_path)
    target = store.write("coparticipacion", "sample.csv", b"a,b,c\n1,2,3\n")

    assert target == tmp_path / "coparticipacion" / "sample.csv"
    assert target.read_bytes() == b"a,b,c\n1,2,3\n"


def test_exists_reflects_written_file(tmp_path) -> None:
    store = LocalArchiveStore(root=tmp_path)
    assert store.exists("ipc", "series.json") is False

    store.write("ipc", "series.json", b"{}")
    assert store.exists("ipc", "series.json") is True


def test_read_returns_previously_written_bytes(tmp_path) -> None:
    store = LocalArchiveStore(root=tmp_path)
    store.write("htc-fallos", "fallo-2023.pdf", b"%PDF-1.4 fake")

    assert store.read("htc-fallos", "fallo-2023.pdf") == b"%PDF-1.4 fake"
