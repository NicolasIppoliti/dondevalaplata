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


SIBOM_ACTO_ENTRY = {
    "id": "sibom-actos/boletin-031-decreto-205-2022",
    "capability": "sibom-actos",
    "source": "sibom.slyt.gba.gob.ar",
    "source_url": "https://sibom.slyt.gba.gob.ar/bulletins/7283/contents/1768533",
    "mime": "text/html",
    "notes": "Decreto Nº 205/2022 (adjudicación) -- boletin-031",
}


def _acto_html(csrf: str, paloma: str) -> bytes:
    """A SIBOM act page carries three per-request volatile values that are
    not part of the published act: a Rails CSRF token and the same Paloma
    analytics timestamp twice.
    """
    return (
        f'<meta name="csrf-token" content="{csrf}" />\n'
        f'<div class="js-paloma-hook" data-palomaid="{paloma}">\n'
        f'  var id = "{paloma}",\n'
        f"<p>ARTICULO 1: Adjudicar a RO-BOT S.R.L</p>\n"
    ).encode()


def test_archive_source_strips_volatile_tokens_from_sibom_actos(tmp_path) -> None:
    """Two fetches of the SAME unchanged act must archive identical bytes and
    the same sha256. Without this, every archive run reports spurious content
    drift, spawns a phantom dated manifest row, and leaves the superseded row
    asserting a sha256 that its own (overwritten) file no longer has -- i.e.
    the manifest would claim provenance it cannot honour.
    """
    first = _acto_html("7l49xlyn+RlE5k+W2xxWXvq3wMc2ymYL", "1784662724969")
    second = _acto_html("ChZt23aOh3nZ81mcZSHyYzlMg6Hbb8xv", "1784662724941")
    assert first != second  # the raw captures genuinely differ

    records = []
    for payload in (first, second):
        fetcher = FakeFetcher({SIBOM_ACTO_ENTRY["source_url"]: FetchResponse(200, payload)})
        records.append(
            archive_source(
                {**SIBOM_ACTO_ENTRY, "filename": "boletin-031-decreto-205-2022.html"},
                fetcher=fetcher,
                local_store=LocalArchiveStore(root=tmp_path),
                r2_store=None,
                now=FIXED_NOW,
            ).record
        )

    assert records[0]["sha256"] == records[1]["sha256"]
    archived = (tmp_path / "sibom-actos" / "boletin-031-decreto-205-2022.html").read_bytes()
    assert records[0]["sha256"] == sha256_of(archived)
    # The act's own text is preserved verbatim; only the volatile values go.
    assert b"Adjudicar a RO-BOT S.R.L" in archived
    assert b"7l49xlyn" not in archived
    assert b"1784662724969" not in archived


def test_archive_source_leaves_non_sibom_captures_byte_exact(tmp_path) -> None:
    """Normalization is scoped to the one capability with a proven volatile
    payload. Every other capability is still archived byte-for-byte.
    """
    data = b'<meta name="csrf-token" content="keepme" />\n'
    fetcher = FakeFetcher({ENTRY["source_url"]: FetchResponse(200, data)})
    local_store = LocalArchiveStore(root=tmp_path)

    result = archive_source(
        {**ENTRY, "filename": "file.csv"},
        fetcher=fetcher,
        local_store=local_store,
        r2_store=None,
        now=FIXED_NOW,
    )

    assert result.record["sha256"] == sha256_of(data)
    assert (tmp_path / "coparticipacion-viewer" / "file.csv").read_bytes() == data


def test_archive_source_records_archived_path_relative_to_local_store_root(tmp_path) -> None:
    """archived_path must be portable (repo-relative), never an absolute machine path."""
    data = b"a,b\n1,2\n"
    fetcher = FakeFetcher({ENTRY["source_url"]: FetchResponse(200, data)})
    local_store = LocalArchiveStore(root=tmp_path / "archive")

    result = archive_source(
        {**ENTRY, "filename": "file.csv"},
        fetcher=fetcher,
        local_store=local_store,
        r2_store=None,
        now=FIXED_NOW,
    )

    assert result.record["archived_path"] == "archive/coparticipacion-viewer/file.csv"


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


def test_run_archive_all_preserves_prior_ok_record_across_a_failed_rerun(tmp_path) -> None:
    """End-to-end safety net for the C1 fix (see test_manifest.py's unit test):
    a source that archived successfully on run 1 but fails (HTTP 429) on a
    later ``etl archive`` re-run must keep its working archived_url/sha256
    in the manifest, not get overwritten with the failed attempt's empty
    fields -- this is exactly the class of run that regressed real
    mcr-docs data during Slice 2 (see apply-progress's incident narrative).
    """
    manifest_path = tmp_path / "archive-manifest.json"
    local_root = tmp_path / "archive"
    good_data = b"a,b\n1,2\n"

    run_archive_all(
        {"coparticipacion-viewer": [{**ENTRY, "filename": "file.csv"}]},
        fetcher=FakeFetcher({ENTRY["source_url"]: FetchResponse(200, good_data)}),
        local_root=local_root,
        manifest_path=manifest_path,
        r2_store=None,
    )
    first_pass = load_manifest(manifest_path)
    assert first_pass[0]["status"] == "ok"
    assert first_pass[0]["sha256"] == sha256_of(good_data)

    run_archive_all(
        {"coparticipacion-viewer": [{**ENTRY, "filename": "file.csv"}]},
        fetcher=FakeFetcher({ENTRY["source_url"]: FetchResponse(429, b"")}),
        local_root=local_root,
        manifest_path=manifest_path,
        r2_store=None,
    )
    second_pass = load_manifest(manifest_path)

    assert len(second_pass) == 1
    record = second_pass[0]
    assert record["status"] == "ok"
    assert record["sha256"] == sha256_of(good_data)
    assert record["archived_path"] is not None
    assert "429" in (record.get("last_error") or "")


def test_run_archive_all_applies_politeness_delay_for_mcr_docs(tmp_path) -> None:
    """mcr.gob.ar rate-limited rapid sequential requests (HTTP 429) during apply."""
    entries = [
        {
            "id": f"mcr-docs/doc-{i}",
            "source": "mcr.gob.ar",
            "source_url": f"https://mcr.gob.ar/doc-{i}.pdf",
            "mime": "application/pdf",
            "notes": "",
            "filename": f"doc-{i}.pdf",
        }
        for i in range(3)
    ]
    fetcher = FakeFetcher(
        {e["source_url"]: FetchResponse(200, b"%PDF-fake") for e in entries}
    )
    sleeps: list[float] = []

    run_archive_all(
        {"mcr-docs": entries},
        fetcher=fetcher,
        local_root=tmp_path / "archive",
        manifest_path=tmp_path / "archive-manifest.json",
        r2_store=None,
        sleep=sleeps.append,
    )

    # One delay between each pair of entries, not after the last one.
    from etl.archive import POLITENESS_DELAY_SECONDS

    expected_delay = POLITENESS_DELAY_SECONDS["mcr-docs"]
    assert sleeps == [expected_delay, expected_delay]
