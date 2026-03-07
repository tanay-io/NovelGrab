"""
NovelGrab – Storage Client (Python)

Mirrors the Node.js storage service. Uploads chapter content
to local filesystem or S3-compatible storage.

Deterministic paths:
  /novels/{slug}/chapters/{chapterNumber}.json
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional

from config import config

log = logging.getLogger("novelgrab.storage")


def chapter_storage_key(slug: str, chapter_number: int) -> str:
    """Build deterministic storage key for a chapter."""
    num = str(chapter_number).zfill(4)
    return f"novels/{slug}/chapters/{num}.json"


def _local_path(key: str) -> Path:
    """Resolve a storage key to a local filesystem path."""
    return Path(config.LOCAL_STORAGE_PATH) / key


# ─── Local Storage ──────────────────────────────────────────────────


def upload_local(key: str, content: str) -> str:
    """Write content to local storage. Returns the storage path."""
    file_path = _local_path(key)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content, encoding="utf-8")
    log.debug("Uploaded to local: %s", key)
    return str(file_path)


def download_local(key: str) -> Optional[str]:
    """Read content from local storage. Returns None if not found."""
    file_path = _local_path(key)
    if not file_path.exists():
        return None
    return file_path.read_text(encoding="utf-8")


def exists_local(key: str) -> bool:
    """Check if a file exists in local storage."""
    return _local_path(key).exists()


# ─── S3-Compatible Storage ──────────────────────────────────────────

_s3_client = None


def _get_s3_client():
    """Lazy-initialize S3 client."""
    global _s3_client
    if _s3_client is not None:
        return _s3_client

    import boto3

    kwargs = {
        "region_name": config.S3_REGION,
        "aws_access_key_id": config.S3_ACCESS_KEY_ID,
        "aws_secret_access_key": config.S3_SECRET_ACCESS_KEY,
    }
    if config.S3_ENDPOINT:
        kwargs["endpoint_url"] = config.S3_ENDPOINT

    _s3_client = boto3.client("s3", **kwargs)
    return _s3_client


def upload_s3(key: str, content: str, content_type: str = "application/json") -> str:
    """Upload content to S3-compatible storage."""
    client = _get_s3_client()
    client.put_object(
        Bucket=config.S3_BUCKET,
        Key=key,
        Body=content.encode("utf-8"),
        ContentType=content_type,
    )
    log.debug("Uploaded to S3: %s", key)
    return f"s3://{config.S3_BUCKET}/{key}"


def download_s3(key: str) -> Optional[str]:
    """Download content from S3-compatible storage."""
    client = _get_s3_client()
    try:
        resp = client.get_object(Bucket=config.S3_BUCKET, Key=key)
        return resp["Body"].read().decode("utf-8")
    except client.exceptions.NoSuchKey:
        return None
    except Exception:
        return None


def exists_s3(key: str) -> bool:
    """Check if an object exists in S3."""
    client = _get_s3_client()
    try:
        client.head_object(Bucket=config.S3_BUCKET, Key=key)
        return True
    except Exception:
        return False


# ─── Unified Interface ─────────────────────────────────────────────


def upload(key: str, content: str, content_type: str = "application/json") -> str:
    """Upload content to configured storage provider."""
    if config.STORAGE_PROVIDER == "s3":
        return upload_s3(key, content, content_type)
    return upload_local(key, content)


def download(key: str) -> Optional[str]:
    """Download content from configured storage provider."""
    if config.STORAGE_PROVIDER == "s3":
        return download_s3(key)
    return download_local(key)


def exists(key: str) -> bool:
    """Check if content exists in configured storage provider."""
    if config.STORAGE_PROVIDER == "s3":
        return exists_s3(key)
    return exists_local(key)
