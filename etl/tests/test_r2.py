"""Unit tests for the Cloudflare R2 storage seam (etl.r2).

No network calls here: ``R2Store.upload`` is exercised against a fake
S3-compatible client so this suite never touches the network, per the
R2 storage seam requirement.
"""

from etl.r2 import R2Store


class FakeS3Client:
    def __init__(self) -> None:
        self.put_calls: list[dict[str, object]] = []

    def put_object(self, **kwargs: object) -> object:
        self.put_calls.append(kwargs)
        return {"ETag": '"fake-etag"'}


def test_from_env_returns_none_when_credentials_missing() -> None:
    assert R2Store.from_env(env={}) is None


def test_from_env_returns_none_when_partially_configured() -> None:
    partial = {
        "R2_ACCOUNT_ID": "acc123",
        "R2_ACCESS_KEY_ID": "key123",
        # missing R2_SECRET_ACCESS_KEY and R2_BUCKET
    }
    assert R2Store.from_env(env=partial) is None


def test_upload_calls_put_object_and_returns_public_base_url() -> None:
    client = FakeS3Client()
    store = R2Store(bucket="portal-archive", client=client, public_base_url="https://archive.example.org")

    url = store.upload("coparticipacion/2026-04.csv", b"a,b\n1,2\n", "text/csv")

    assert url == "https://archive.example.org/coparticipacion/2026-04.csv"
    assert len(client.put_calls) == 1
    call = client.put_calls[0]
    assert call["Bucket"] == "portal-archive"
    assert call["Key"] == "coparticipacion/2026-04.csv"
    assert call["Body"] == b"a,b\n1,2\n"
    assert call["ContentType"] == "text/csv"


def test_upload_falls_back_to_r2_dev_url_without_public_base_url() -> None:
    client = FakeS3Client()
    store = R2Store(bucket="portal-archive", client=client, public_base_url=None)

    url = store.upload("ipc/nivel-general.json", b"{}", "application/json")

    assert url == "https://portal-archive.r2.dev/ipc/nivel-general.json"
