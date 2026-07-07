"""Cloudflare R2 (S3-compatible) storage seam for canonical archived copies.

Reads credentials from environment variables, populated locally via
``etl/.env`` (never committed — see ``.env.example``):

    R2_ACCOUNT_ID
    R2_ACCESS_KEY_ID
    R2_SECRET_ACCESS_KEY
    R2_BUCKET
    R2_PUBLIC_BASE_URL   (optional; public base URL prefix for archived_url)

If any required variable is missing, ``R2Store.from_env()`` returns
``None`` and callers fall back to local-only archival: ``archived_url``
stays unresolved and is recorded as pending in the manifest ``notes``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Protocol


class S3ClientLike(Protocol):
    """Minimal subset of the boto3 S3 client used here (fakeable in tests)."""

    def put_object(self, **kwargs: object) -> object: ...


@dataclass
class R2Store:
    bucket: str
    client: S3ClientLike
    public_base_url: str | None = None

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> R2Store | None:
        """Build an ``R2Store`` from environment variables, or ``None``.

        Returns ``None`` when any required credential is missing so callers
        can fall back to local-only archival without raising.
        """
        source = os.environ if env is None else env
        account_id = source.get("R2_ACCOUNT_ID")
        access_key = source.get("R2_ACCESS_KEY_ID")
        secret_key = source.get("R2_SECRET_ACCESS_KEY")
        bucket = source.get("R2_BUCKET")
        if not all([account_id, access_key, secret_key, bucket]):
            return None

        import boto3  # local import: optional dependency, only needed when configured

        client = boto3.client(
            "s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto",
        )
        return cls(
            bucket=bucket, client=client, public_base_url=source.get("R2_PUBLIC_BASE_URL")
        )

    def upload(self, key: str, data: bytes, content_type: str) -> str:
        """Upload bytes to R2 under ``key`` and return the canonical public URL."""
        self.client.put_object(
            Bucket=self.bucket, Key=key, Body=data, ContentType=content_type
        )
        if self.public_base_url:
            return f"{self.public_base_url.rstrip('/')}/{key}"
        return f"https://{self.bucket}.r2.dev/{key}"
