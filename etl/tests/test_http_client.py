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


def test_get_retries_on_429_honoring_retry_after_header() -> None:
    throttled = Mock(status_code=429, content=b"", headers={"Retry-After": "3"})
    ok_response = Mock(status_code=200, content=b"ok", headers={})
    with (
        patch("etl.http_client.requests.get", side_effect=[throttled, ok_response]) as mocked,
        patch("etl.http_client.time.sleep") as mocked_sleep,
    ):
        fetcher = RequestsFetcher(max_retries=2, retry_delay_seconds=0.1)
        result = fetcher.get("https://example.org/f.pdf", timeout=10, headers={})

    assert mocked.call_count == 2
    mocked_sleep.assert_called_once_with(3.0)
    assert result.status_code == 200
    assert result.content == b"ok"


def test_get_falls_back_to_default_delay_on_429_without_retry_after() -> None:
    throttled = Mock(status_code=429, content=b"", headers={})
    ok_response = Mock(status_code=200, content=b"ok", headers={})
    with (
        patch("etl.http_client.requests.get", side_effect=[throttled, ok_response]),
        patch("etl.http_client.time.sleep") as mocked_sleep,
    ):
        fetcher = RequestsFetcher(max_retries=2, retry_delay_seconds=1.5)
        fetcher.get("https://example.org/f.pdf", timeout=10, headers={})

    mocked_sleep.assert_called_once_with(1.5)


def test_get_returns_429_response_after_exhausting_retries() -> None:
    throttled = Mock(status_code=429, content=b"", headers={})
    with (
        patch("etl.http_client.requests.get", return_value=throttled),
        patch("etl.http_client.time.sleep"),
    ):
        fetcher = RequestsFetcher(max_retries=2, retry_delay_seconds=0.1)
        result = fetcher.get("https://example.org/f.pdf", timeout=10, headers={})

    assert result.status_code == 429


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
