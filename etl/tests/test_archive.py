"""Unit tests for the archival orchestration core (etl.archive).

Uses a fake fetcher — no network I/O in this suite.
"""

from datetime import UTC, datetime

from etl.archive import FetchResponse, archive_source, run_archive_all
from etl.manifest import load_manifest
from etl.storage import LocalArchiveStore, sha256_of


class FakeFetcher:
    def __init__(self, responses: dict[str, FetchResponse | Exception]) -> None:
        self.responses = responses
        self.calls: list[str] = []

    def get(self, url: str, *, timeout: float, headers: dict[str, str]) -> FetchResponse:
        self.calls.append(url)
        outcome = self.responses[url]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


FIXED_NOW = datetime(2026, 7, 6, 20, 0, 0, tzinfo=UTC)

ENTRY = {
    "id": "coparticipacion/transferencias-municipios",
    "capability": "coparticipacion-viewer",
    "source": "catalogo.datos.gba.gob.ar",
    "source_url": "https://catalogo.datos.gba.gob.ar/dataset/x/download/file.csv",
    "mime": "text/csv",
    "notes": "municipio_id 06182",
}


def test_archive_source_success_writes_local_copy_and_record(tmp_path) -> None:
    data = b"a,b\n1,2\n"
    fetcher = FakeFetcher({ENTRY["source_url"]: FetchResponse(200, data)})
    local_store = LocalArchiveStore(root=tmp_path)

    result = archive_source(
        {**ENTRY, "filename": "file.csv"},
        fetcher=fetcher,
        local_store=local_store,
        r2_store=None,
        now=FIXED_NOW,
    )

    assert result.record["status"] == "ok"
    assert result.record["sha256"] == sha256_of(data)
    assert result.record["bytes"] == len(data)
    assert result.record["archived_url"] is None  # no R2 store configured
    assert "R2 upload pending" in result.record["notes"]
    assert (tmp_path / "coparticipacion-viewer" / "file.csv").read_bytes() == data


def test_archive_source_uploads_to_r2_when_configured(tmp_path) -> None:
    data = b"a,b\n1,2\n"
    fetcher = FakeFetcher({ENTRY["source_url"]: FetchResponse(200, data)})
    local_store = LocalArchiveStore(root=tmp_path)

    class FakeR2:
        def upload(self, key: str, payload: bytes, content_type: str) -> str:
            return f"https://archive.example.org/{key}"

    result = archive_source(
        {**ENTRY, "filename": "file.csv"},
        fetcher=fetcher,
        local_store=local_store,
        r2_store=FakeR2(),
        now=FIXED_NOW,
    )

    assert result.record["archived_url"] == (
        "https://archive.example.org/coparticipacion-viewer/file.csv"
    )


def test_archive_source_records_http_error_without_raising(tmp_path) -> None:
    fetcher = FakeFetcher({ENTRY["source_url"]: FetchResponse(404, b"")})
    local_store = LocalArchiveStore(root=tmp_path)

    result = archive_source(
        {**ENTRY, "filename": "file.csv"},
        fetcher=fetcher,
        local_store=local_store,
        r2_store=None,
        now=FIXED_NOW,
    )

    assert result.record["status"] == "error"
    assert result.record["sha256"] is None
    assert "404" in result.record["notes"]


def test_archive_source_records_network_exception_without_raising(tmp_path) -> None:
    fetcher = FakeFetcher({ENTRY["source_url"]: ConnectionError("DNS failure")})
    local_store = LocalArchiveStore(root=tmp_path)

    result = archive_source(
        {**ENTRY, "filename": "file.csv"},
        fetcher=fetcher,
        local_store=local_store,
        r2_store=None,
        now=FIXED_NOW,
    )

    assert result.record["status"] == "error"
    assert "fetch failed" in result.record["notes"]


def test_run_archive_all_writes_manifest_for_every_capability(tmp_path) -> None:
    sources = {
        "coparticipacion-viewer": [{**ENTRY, "filename": "file.csv"}],
        "ipc": [
            {
                "id": "ipc/nivel-general-nacional",
                "source": "datos.gob.ar",
                "source_url": "https://apis.datos.gob.ar/series/api/series/?ids=X",
                "mime": "application/json",
                "notes": "",
                "filename": "ipc-raw.json",
            }
        ],
    }
    fetcher = FakeFetcher(
        {
            ENTRY["source_url"]: FetchResponse(200, b"a,b\n1,2\n"),
            "https://apis.datos.gob.ar/series/api/series/?ids=X": FetchResponse(
                200, b'{"data": []}'
            ),
        }
    )
    manifest_path = tmp_path / "archive-manifest.json"

    records = run_archive_all(
        sources,
        fetcher=fetcher,
        local_root=tmp_path / "archive",
        manifest_path=manifest_path,
        r2_store=None,
    )

    assert len(records) == 2
    assert load_manifest(manifest_path) == records
    ids = {r["id"] for r in records}
    assert ids == {"coparticipacion/transferencias-municipios", "ipc/nivel-general-nacional"}
