"""
NovelGrab – Python Worker Configuration

Loads environment variables and provides typed configuration.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration loaded from environment."""

    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "127.0.0.1")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")

    # Scraper
    SCRAPER_URL: str = os.getenv("SCRAPER_URL", "http://localhost:8000")

    # Storage
    STORAGE_PROVIDER: str = os.getenv("STORAGE_PROVIDER", "local")
    LOCAL_STORAGE_PATH: str = os.getenv("LOCAL_STORAGE_PATH", "../node-api/storage")

    # S3
    S3_ENDPOINT: str = os.getenv("S3_ENDPOINT", "")
    S3_REGION: str = os.getenv("S3_REGION", "auto")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "novelgrab")
    S3_ACCESS_KEY_ID: str = os.getenv("S3_ACCESS_KEY_ID", "")
    S3_SECRET_ACCESS_KEY: str = os.getenv("S3_SECRET_ACCESS_KEY", "")

    # Queue names (must match Node.js)
    CHAPTER_CACHE_QUEUE: str = "chapter-cache"

    @classmethod
    def redis_url(cls) -> str:
        """Build Redis URL from components."""
        if cls.REDIS_PASSWORD:
            return f"redis://:{cls.REDIS_PASSWORD}@{cls.REDIS_HOST}:{cls.REDIS_PORT}/0"
        return f"redis://{cls.REDIS_HOST}:{cls.REDIS_PORT}/0"


config = Config()
