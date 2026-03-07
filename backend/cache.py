"""
NovelGrab – File-based JSON cache.

Caches search results, novel info, and chapter content to avoid
re-fetching from the scraper on repeated requests.  Uses a simple
flat-file layout under  ./cache/  with TTL-based expiration.

Layout:
  cache/
    search/        <hash>.json      (TTL = 30 min)
    novel_info/    <hash>.json      (TTL = 60 min)
    chapters/      <hash>.json      (TTL = 24 h)
    dictionary/    <word>.json      (TTL = 7 d)
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
_CACHE_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

# TTL in seconds
TTL_SEARCH = 30 * 60        # 30 minutes
TTL_NOVEL_INFO = 60 * 60    # 1 hour
TTL_CHAPTER = 24 * 60 * 60  # 24 hours
TTL_DICTIONARY = 7 * 24 * 60 * 60  # 7 days


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _hash_key(key: str) -> str:
    """SHA-256 hash → first 16 hex chars.  Collision-safe enough for a cache."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Core get / set
# ---------------------------------------------------------------------------

def cache_get(namespace: str, raw_key: str, ttl: int) -> Optional[Any]:
    """Return cached JSON value (parsed) or None if missing / expired."""
    folder = os.path.join(_CACHE_ROOT, namespace)
    path = os.path.join(folder, _hash_key(raw_key) + ".json")

    if not os.path.exists(path):
        return None

    try:
        with open(path, "r", encoding="utf-8") as f:
            envelope = json.load(f)
    except (json.JSONDecodeError, OSError):
        # corrupted file → treat as miss
        try:
            os.remove(path)
        except OSError:
            pass
        return None

    stored_at = envelope.get("t", 0)
    if time.time() - stored_at > ttl:
        # expired
        try:
            os.remove(path)
        except OSError:
            pass
        return None

    return envelope.get("d")


def cache_set(namespace: str, raw_key: str, data: Any) -> None:
    """Write *data* (JSON-serialisable) to the cache."""
    folder = os.path.join(_CACHE_ROOT, namespace)
    _ensure_dir(folder)
    path = os.path.join(folder, _hash_key(raw_key) + ".json")

    envelope = {"t": time.time(), "d": data}
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(envelope, f, ensure_ascii=False)
    except OSError:
        pass  # non-fatal; we just lose the cache entry


# ---------------------------------------------------------------------------
# Convenience helpers  (used in main.py)
# ---------------------------------------------------------------------------

def get_search(query: str) -> Optional[Any]:
    return cache_get("search", query.lower().strip(), TTL_SEARCH)

def set_search(query: str, data: Any) -> None:
    cache_set("search", query.lower().strip(), data)

def get_novel_info_cache(url: str) -> Optional[Any]:
    return cache_get("novel_info", url, TTL_NOVEL_INFO)

def set_novel_info_cache(url: str, data: Any) -> None:
    cache_set("novel_info", url, data)

def get_chapter(url: str) -> Optional[str]:
    return cache_get("chapters", url, TTL_CHAPTER)

def set_chapter(url: str, content: str) -> None:
    cache_set("chapters", url, content)

def get_dictionary(word: str) -> Optional[Any]:
    return cache_get("dictionary", word.lower().strip(), TTL_DICTIONARY)

def set_dictionary(word: str, data: Any) -> None:
    cache_set("dictionary", word.lower().strip(), data)


# ---------------------------------------------------------------------------
# Housekeeping
# ---------------------------------------------------------------------------

def clear_all() -> int:
    """Delete every cached file.  Returns count of files removed."""
    count = 0
    for ns in ("search", "novel_info", "chapters", "dictionary"):
        folder = os.path.join(_CACHE_ROOT, ns)
        if not os.path.isdir(folder):
            continue
        for fn in os.listdir(folder):
            try:
                os.remove(os.path.join(folder, fn))
                count += 1
            except OSError:
                pass
    return count


def cache_stats() -> dict:
    """Return per-namespace file counts + total size."""
    stats: dict = {}
    total_size = 0
    for ns in ("search", "novel_info", "chapters", "dictionary"):
        folder = os.path.join(_CACHE_ROOT, ns)
        if not os.path.isdir(folder):
            stats[ns] = {"files": 0, "size_kb": 0}
            continue
        files = os.listdir(folder)
        size = sum(
            os.path.getsize(os.path.join(folder, f))
            for f in files
            if os.path.isfile(os.path.join(folder, f))
        )
        stats[ns] = {"files": len(files), "size_kb": round(size / 1024, 1)}
        total_size += size
    stats["total_size_kb"] = round(total_size / 1024, 1)
    return stats
