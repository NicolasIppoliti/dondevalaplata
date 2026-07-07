"""Unit tests for the requests-based fetcher (etl.http_client).

Mocks ``requests.get`` — no real network I/O in this suite.
"""

from unittest.mock import Mock, patch

import requests

from etl.http_client import RequestsFetcher


def test_get_returns_fetch_response_on_success() -> None:
    fake_response = Mock(status_code=200, content=b"hello", headers={"Content-Type": "text/csv"})
    with patch("etl.http_client.requests.get", return_value=fake_response) as mocked:
        fetcher = RequestsFetcher()
        result = fetcher.get("https://example.org/f.csv", timeout=10, headers={"User-Agent": "x"})

    mocked.assert_called_once()
    assert result.status_code == 200
    assert result.content == b"hello"
    assert result.headers["Content-Type"] == "text/csv"


def test_get_retries_on_request_exception_then_succeeds() -> None:
    fake_response = Mock(status_code=200, content=b"ok", headers={})
    with (
        patch(
            "etl.http_client.requests.get",
            side_effect=[requests.ConnectionError("boom"), fake_response],
        ) as mocked,
        patch("etl.http_client.time.sleep") as mocked_sleep,
    ):
        fetcher = RequestsFetcher(max_retries=2, retry_delay_seconds=0.1)
        result = fetcher.get("https://example.org/f.csv", timeout=10, headers={})

    assert mocked.call_count == 2
    mocked_sleep.assert_called_once_with(0.1)
    assert result.content == b"ok"


def test_head_returns_status_code_only_without_downloading_body() -> None:
    fake_response = Mock(status_code=200, headers={"Content-Length": "88157604"})
    with patch("etl.http_client.requests.head", return_value=fake_response) as mocked:
        fetcher = RequestsFetcher()
        result = fetcher.head(
            "https://example.org/big.zip", timeout=10, headers={"User-Agent": "x"}
        )

    mocked.assert_called_once()
    assert result.status_code == 200
    assert result.headers["Content-Length"] == "88157604"


def test_get_raises_after_exhausting_retries() -> None:
    with (
        patch(
            "etl.http_client.requests.get",
            side_effect=requests.ConnectionError("boom"),
        ),
        patch("etl.http_client.time.sleep"),
    ):
        fetcher = RequestsFetcher(max_retries=2, retry_delay_seconds=0.1)
        try:
            fetcher.get("https://example.org/f.csv", timeout=10, headers={})
        except requests.ConnectionError:
            pass
        else:
            raise AssertionError("expected ConnectionError to propagate")
