"""
NovelGrab – Python Chapter Cache Worker

FOCUSED worker that does ONLY:
  1. Receive job from Redis queue (BullMQ-compatible)
  2. Fetch chapter HTML from source
  3. Parse & clean content
  4. Upload to object storage
  5. Report completion back to Redis

This worker polls the BullMQ 'chapter-cache' queue using Redis
BRPOPLPUSH pattern for reliable processing.

Pattern from async-python-patterns + bullmq-specialist skills:
  - Async I/O for HTTP requests
  - Structured logging
  - Graceful shutdown
  - Job acknowledgement

NOTE: BullMQ uses a custom Redis data structure. This worker uses
a simplified polling approach that's compatible with BullMQ's queue
format. The Node.js worker handles the main queue processing; this
Python worker provides an ALTERNATIVE direct-scraping path.
"""

import asyncio
import json
import logging
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
import redis

from config import config
from storage import chapter_storage_key, upload, exists

# ─── Logging ────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("novelgrab.worker")

# ─── Redis Connection ───────────────────────────────────────────────

redis_client = redis.Redis(
    host=config.REDIS_HOST,
    port=config.REDIS_PORT,
    password=config.REDIS_PASSWORD or None,
    decode_responses=True,
)

# ─── Job Processing ─────────────────────────────────────────────────

_shutdown = False


async def process_chapter_job(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a single chapter cache job.

    Job data format:
      {
        "novelSlug": "martial-peak",
        "chapterNumber": 42,
        "sourceUrl": "https://novelbin.com/b/martial-peak/chapter-42",
        "title": "Chapter 42"
      }

    Returns:
      {"success": True, "cached": True}
    """
    novel_slug = job_data.get("novelSlug", "")
    chapter_number = job_data.get("chapterNumber", 0)
    source_url = job_data.get("sourceUrl", "")
    title = job_data.get("title", f"Chapter {chapter_number}")

    log.info(
        "Processing chapter: %s #%d (%s)",
        novel_slug, chapter_number, title,
    )

    # 1. Check if already cached
    storage_key = chapter_storage_key(novel_slug, chapter_number)
    if exists(storage_key):
        log.info("Chapter already cached: %s #%d", novel_slug, chapter_number)
        return {"success": True, "cached": True, "already_existed": True}

    # 2. Fetch chapter content from Python scraper API
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                f"{config.SCRAPER_URL}/api/chapter-content",
                params={"url": source_url},
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.error(
                "Failed to fetch chapter %s #%d: %s",
                novel_slug, chapter_number, exc,
            )
            raise

    content = data.get("content", "")

    if not content or "Error loading chapter" in content:
        log.warning(
            "Empty or error content for %s #%d", novel_slug, chapter_number
        )
        raise RuntimeError(f"Failed to fetch chapter content: {novel_slug} #{chapter_number}")

    # 3. Build cache payload
    cache_payload = json.dumps({
        "html": content,
        "title": title,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    })

    # 4. Upload to object storage
    upload(storage_key, cache_payload)

    log.info("✅ Cached chapter: %s #%d → %s", novel_slug, chapter_number, storage_key)

    return {"success": True, "cached": True, "storagePath": storage_key}


# ─── Queue Polling ──────────────────────────────────────────────────

async def poll_queue():
    """
    Poll the chapter-cache queue for jobs.

    BullMQ stores jobs in Redis lists. We use a simplified polling
    approach that checks for pending jobs and processes them.
    The Node.js worker is the PRIMARY consumer; this Python worker
    is a SUPPLEMENTARY consumer for direct scraping tasks.
    """
    queue_key = f"bull:{config.CHAPTER_CACHE_QUEUE}:wait"
    processing_key = f"bull:{config.CHAPTER_CACHE_QUEUE}:active"

    log.info("🐍 Python chapter worker started")
    log.info("Polling queue: %s", queue_key)
    log.info("Scraper URL: %s", config.SCRAPER_URL)
    log.info("Storage provider: %s", config.STORAGE_PROVIDER)

    while not _shutdown:
        try:
            # Try to get a job from the waiting list
            # BRPOPLPUSH: atomic move from wait → active
            job_id = redis_client.brpoplpush(
                queue_key, processing_key, timeout=5
            )

            if job_id is None:
                continue

            # Read job data from Redis hash
            job_key = f"bull:{config.CHAPTER_CACHE_QUEUE}:{job_id}"
            job_raw = redis_client.hget(job_key, "data")

            if not job_raw:
                log.warning("Job %s has no data, skipping", job_id)
                # Remove from active
                redis_client.lrem(processing_key, 1, job_id)
                continue

            job_data = json.loads(job_raw)

            # Process the job
            try:
                result = await process_chapter_job(job_data)

                # Mark as completed in Redis
                redis_client.hset(
                    job_key,
                    mapping={
                        "returnvalue": json.dumps(result),
                        "finishedOn": str(int(time.time() * 1000)),
                    },
                )

                # Move from active to completed
                redis_client.lrem(processing_key, 1, job_id)
                completed_key = f"bull:{config.CHAPTER_CACHE_QUEUE}:completed"
                redis_client.lpush(completed_key, job_id)

            except Exception as exc:
                log.error("Job %s failed: %s", job_id, exc)

                # Record failure
                redis_client.hset(
                    job_key,
                    mapping={
                        "failedReason": str(exc),
                        "finishedOn": str(int(time.time() * 1000)),
                    },
                )

                # Move from active to failed
                redis_client.lrem(processing_key, 1, job_id)
                failed_key = f"bull:{config.CHAPTER_CACHE_QUEUE}:failed"
                redis_client.lpush(failed_key, job_id)

        except redis.ConnectionError as exc:
            log.error("Redis connection lost: %s — retrying in 5s", exc)
            await asyncio.sleep(5)
        except Exception as exc:
            log.error("Unexpected error: %s", exc)
            await asyncio.sleep(1)


# ─── Graceful Shutdown ──────────────────────────────────────────────

def handle_shutdown(signum, frame):
    """Handle shutdown signals."""
    global _shutdown
    log.info("Received signal %s, shutting down...", signum)
    _shutdown = True


signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)


# ─── Main ───────────────────────────────────────────────────────────

def main():
    """Entry point for the Python worker."""
    # Verify Redis connectivity
    try:
        redis_client.ping()
        log.info("Redis connection OK")
    except redis.ConnectionError as exc:
        log.error("Cannot connect to Redis: %s", exc)
        sys.exit(1)

    # Verify scraper connectivity
    try:
        import urllib.request
        req = urllib.request.urlopen(f"{config.SCRAPER_URL}/", timeout=5)
        log.info("Scraper connection OK (status %d)", req.status)
    except Exception:
        log.warning("Scraper not reachable at %s — will retry on jobs", config.SCRAPER_URL)

    # Start polling
    asyncio.run(poll_queue())


if __name__ == "__main__":
    main()
