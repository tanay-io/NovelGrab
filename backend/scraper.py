"""
NovelGrab – Production-grade async scraper.

Bypass strategy stack (in priority order):
  1. curl_cffi  – impersonates real browser TLS fingerprints (Chrome/Edge/Safari)
  2. cloudscraper – JS challenge solver (Cloudflare UAM)
  3. httpx      – plain async HTTP (last resort)

Every layer shares:
  • rotating realistic User-Agent pool
  • full browser-grade request headers (Sec-Fetch-*, etc.)
  • persistent cookie jar / session
  • jittered exponential-backoff retry (up to 4 attempts)
  • random inter-request delays to avoid pattern detection
"""

from __future__ import annotations

import asyncio
import logging
import random
import re
import time
from typing import Any, Callable, Dict, List, Optional, Tuple
from urllib.parse import quote, urljoin

from bs4 import BeautifulSoup

from utils import clean_html

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log = logging.getLogger("novelgrab.scraper")
log.setLevel(logging.DEBUG)
if not log.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("[%(levelname)s] %(name)s: %(message)s"))
    log.addHandler(_h)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BASE_URL = "https://novelbin.com"

# Realistic desktop User-Agents (Chrome, Edge, Firefox on Win/Mac)
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
]

# curl_cffi browser impersonation targets (rotated per-session)
_IMPERSONATE_TARGETS = [
    "chrome124",
    "chrome123",
    "chrome120",
    "chrome119",
    "edge101",
    "safari17_0",
    "safari15_5",
]


def _random_ua() -> str:
    return random.choice(_USER_AGENTS)


def _browser_headers(ua: str, referer: str = BASE_URL + "/") -> Dict[str, str]:
    """Return a full set of browser-realistic request headers."""
    return {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Referer": referer,
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Sec-CH-UA": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": '"Windows"',
        "Cache-Control": "max-age=0",
        "Pragma": "no-cache",
    }


# ---------------------------------------------------------------------------
# Transport layer – three fallback engines
# ---------------------------------------------------------------------------

class _TransportEngine:
    """Abstract interface every engine implements."""

    name: str = "base"

    async def get(self, url: str, *, headers: dict, timeout: float = 30) -> str:
        raise NotImplementedError

    async def close(self) -> None:
        pass


# ---- Engine 1: curl_cffi (TLS fingerprint impersonation) -----------------

class _CurlCffiEngine(_TransportEngine):
    name = "curl_cffi"

    def __init__(self) -> None:
        from curl_cffi.requests import AsyncSession  # type: ignore
        self._target = random.choice(_IMPERSONATE_TARGETS)
        self._session = AsyncSession(impersonate=self._target, verify=False)
        log.info("curl_cffi engine initialised (impersonate=%s)", self._target)

    async def get(self, url: str, *, headers: dict, timeout: float = 30) -> str:
        resp = await self._session.get(
            url, headers=headers, timeout=timeout, allow_redirects=True
        )
        resp.raise_for_status()
        return resp.text

    async def close(self) -> None:
        await self._session.close()


# ---- Engine 2: cloudscraper (CF JS challenge bypass) ----------------------

class _CloudScraperEngine(_TransportEngine):
    name = "cloudscraper"

    def __init__(self) -> None:
        import cloudscraper  # type: ignore
        self._scraper = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "mobile": False},
            delay=5,
        )
        log.info("cloudscraper engine initialised")

    async def get(self, url: str, *, headers: dict, timeout: float = 30) -> str:
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: self._scraper.get(
                url, headers=headers, timeout=timeout, allow_redirects=True
            ),
        )
        resp.raise_for_status()
        return resp.text

    async def close(self) -> None:
        self._scraper.close()


# ---- Engine 3: httpx (fallback) -------------------------------------------

class _HttpxEngine(_TransportEngine):
    name = "httpx"

    def __init__(self) -> None:
        import httpx
        self._client = httpx.AsyncClient(
            http2=True,
            follow_redirects=True,
            timeout=httpx.Timeout(30, connect=15),
        )
        log.info("httpx engine initialised")

    async def get(self, url: str, *, headers: dict, timeout: float = 30) -> str:
        resp = await self._client.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        return resp.text

    async def close(self) -> None:
        await self._client.aclose()


# ---------------------------------------------------------------------------
# Resilient HTTP client – orchestrates engines + retry
# ---------------------------------------------------------------------------

class ResilientClient:
    """
    Production HTTP client:
      - tries engines in priority order (curl_cffi -> cloudscraper -> httpx)
      - retries with jittered exponential backoff (4 attempts per engine)
      - warms up with a homepage visit to collect cookies
      - randomises delays between calls
      - engine-version counter prevents stale-session races during rotation
      - global 429 cooldown pauses all coroutines after rate-limit
    """

    _MAX_RETRIES = 4
    _BACKOFF_BASE = 2.0  # seconds
    _BACKOFF_MAX = 20.0

    def __init__(self) -> None:
        self._engine: Optional[_TransportEngine] = None
        self._engine_version: int = 0          # bumped on every rotation
        self._ua: str = _random_ua()
        self._warmed: bool = False
        self._lock = asyncio.Lock()
        self._rotate_lock = asyncio.Lock()     # serialise engine rotations
        self._cooldown_until: float = 0.0      # global 429 cooldown timestamp

    # -- engine bootstrapping ------------------------------------------------

    async def _try_init_engine(self, cls: type) -> Optional[_TransportEngine]:
        engine = None
        try:
            engine = cls()
            headers = _browser_headers(self._ua)
            html = await engine.get(BASE_URL, headers=headers, timeout=20)
            if len(html) > 500:
                log.info("Engine '%s' passed warm-up check", engine.name)
                return engine
            else:
                log.warning(
                    "Engine '%s' returned suspiciously short response (%d bytes)",
                    engine.name,
                    len(html),
                )
                await engine.close()
        except Exception as exc:
            log.warning(
                "Engine '%s' init failed: %s",
                getattr(engine, "name", cls.__name__),
                exc,
            )
            if engine is not None:
                try:
                    await engine.close()
                except Exception:
                    pass
        return None

    async def _ensure_engine(self) -> _TransportEngine:
        if self._engine is not None:
            return self._engine

        async with self._lock:
            if self._engine is not None:
                return self._engine

            for engine_cls in [_CurlCffiEngine, _CloudScraperEngine, _HttpxEngine]:
                engine = await self._try_init_engine(engine_cls)
                if engine is not None:
                    self._engine = engine
                    self._warmed = True
                    return engine

            # Last resort – raw httpx without warm-up test
            log.error("All engines failed warm-up – falling back to raw httpx")
            eng = _HttpxEngine()
            self._engine = eng
            return eng

    # -- warm-up (seed cookies) ----------------------------------------------

    async def _warm_up(self) -> None:
        """Visit homepage to seed session cookies before real requests."""
        if self._warmed:
            return
        engine = await self._ensure_engine()
        try:
            headers = _browser_headers(self._ua)
            await engine.get(BASE_URL, headers=headers, timeout=20)
            self._warmed = True
            await asyncio.sleep(random.uniform(0.5, 1.5))
        except Exception as exc:
            log.warning("Warm-up failed: %s", exc)

    # -- global 429 cooldown -------------------------------------------------

    async def _wait_for_cooldown(self) -> None:
        """If a 429 cooldown is active, wait until it expires."""
        now = time.monotonic()
        if now < self._cooldown_until:
            wait = self._cooldown_until - now
            log.debug("Global 429 cooldown active – waiting %.1fs", wait)
            await asyncio.sleep(wait)

    def _set_cooldown(self, seconds: float) -> None:
        """Set a global cooldown – all coroutines will pause."""
        target = time.monotonic() + seconds
        if target > self._cooldown_until:
            self._cooldown_until = target
            log.info("Global cooldown set for %.1fs", seconds)

    # -- core fetch with retry -----------------------------------------------

    async def fetch(
        self,
        url: str,
        *,
        referer: str = BASE_URL + "/",
        timeout: float = 30,
    ) -> str:
        """
        Fetch a URL with full retry & engine-fallback logic.
        Re-acquires the engine on every attempt so that engine rotations
        performed by *other* coroutines are picked up automatically.
        """
        last_exc: Optional[Exception] = None

        for attempt in range(1, self._MAX_RETRIES + 1):
            # Respect global 429 cooldown
            await self._wait_for_cooldown()

            # Always grab the *current* engine (may have been rotated)
            engine = await self._ensure_engine()
            version_before = self._engine_version
            headers = _browser_headers(self._ua, referer=referer)

            try:
                # Jittered backoff on retries
                if attempt > 1:
                    backoff = min(
                        self._BACKOFF_BASE * (2 ** (attempt - 1)),
                        self._BACKOFF_MAX,
                    )
                    jitter = backoff * random.uniform(0.7, 1.5)
                    log.debug("Retry %d – sleeping %.1fs", attempt, jitter)
                    await asyncio.sleep(jitter)

                text = await engine.get(url, headers=headers, timeout=timeout)

                # Validate response isn't a block / challenge page
                if self._looks_like_block(text):
                    log.warning(
                        "Response looks like a block page (attempt %d)", attempt
                    )
                    self._ua = _random_ua()
                    raise RuntimeError("Blocked response detected")

                return text

            except Exception as exc:
                last_exc = exc
                exc_str = str(exc)
                log.warning(
                    "Fetch attempt %d/%d failed for %s: %s",
                    attempt,
                    self._MAX_RETRIES,
                    url,
                    exc_str,
                )

                # Detect HTTP status from the exception
                status = getattr(
                    getattr(exc, "response", None), "status_code", 0
                )

                # "Session is closed" → engine was rotated under us, just retry
                if "session is closed" in exc_str.lower() or "closed" in exc_str.lower():
                    log.debug("Stale session detected – will re-acquire engine")
                    continue

                # 429 rate-limit → set global cooldown + rotate engine once
                if status == 429:
                    self._set_cooldown(random.uniform(8.0, 15.0))
                    if self._engine_version == version_before:
                        await self._safe_rotate_engine()
                    self._ua = _random_ua()
                    continue

                # 403/503 → rotate engine on attempt 2
                if status in (403, 503) and attempt >= 2:
                    if self._engine_version == version_before:
                        await self._safe_rotate_engine()
                    self._ua = _random_ua()

        raise RuntimeError(
            f"All {self._MAX_RETRIES} fetch attempts failed for {url}: {last_exc}"
        )

    async def _safe_rotate_engine(self) -> None:
        """Serialised engine rotation – only one coroutine rotates at a time."""
        async with self._rotate_lock:
            await self._rotate_engine()

    async def _rotate_engine(self) -> None:
        """Drop current engine and try the next available one."""
        old_name = self._engine.name if self._engine else "none"
        old_engine = self._engine

        engine_map = {
            "curl_cffi": _CurlCffiEngine,
            "cloudscraper": _CloudScraperEngine,
            "httpx": _HttpxEngine,
        }
        candidates = [_CurlCffiEngine, _CloudScraperEngine, _HttpxEngine]
        failed_cls = engine_map.get(old_name)
        if failed_cls and failed_cls in candidates:
            candidates.remove(failed_cls)
            candidates.append(failed_cls)

        # Try to initialise a new engine *before* closing the old one
        new_engine: Optional[_TransportEngine] = None
        for cls in candidates:
            new_engine = await self._try_init_engine(cls)
            if new_engine is not None:
                break

        if new_engine is None:
            new_engine = _HttpxEngine()

        # Atomically swap: set new engine first, then close old
        self._engine = new_engine
        self._engine_version += 1
        log.info("Rotated engine: %s -> %s (v%d)", old_name, new_engine.name, self._engine_version)

        if old_engine is not None:
            try:
                await old_engine.close()
            except Exception:
                pass

    @staticmethod
    def _looks_like_block(html: str) -> bool:
        """Heuristic check for Cloudflare / WAF block pages."""
        if len(html) < 800:
            lower = html.lower()
            signals = [
                "just a moment",
                "checking your browser",
                "access denied",
                "enable javascript",
                "cf-browser-verification",
                "cloudflare",
                "captcha",
                "ray id",
                "bot detection",
            ]
            return any(s in lower for s in signals)
        return False

    async def close(self) -> None:
        if self._engine:
            try:
                await self._engine.close()
            except Exception:
                pass
            self._engine = None


# ---------------------------------------------------------------------------
# Module-level client (reused across requests within one process)
# ---------------------------------------------------------------------------
_client: Optional[ResilientClient] = None
_client_lock = asyncio.Lock()


async def _get_client() -> ResilientClient:
    global _client
    if _client is None:
        async with _client_lock:
            if _client is None:
                _client = ResilientClient()
                await _client._warm_up()
    return _client


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def search_novels(query: str) -> List[Dict[str, Any]]:
    """Search novelbin.com for novels matching *query*."""
    client = await _get_client()
    search_url = f"{BASE_URL}/search?keyword={quote(query)}"

    log.info("Searching: %s", search_url)
    html = await client.fetch(search_url, referer=BASE_URL + "/")
    results, total_pages = _parse_search_page(html)

    max_pages = min(total_pages, 5)
    for page_num in range(2, max_pages + 1):
        try:
            page_url = f"{search_url}&page={page_num}"
            page_html = await client.fetch(page_url, referer=search_url)
            page_results, _ = _parse_search_page(page_html)
            results.extend(page_results)
            await asyncio.sleep(random.uniform(0.3, 0.8))
        except Exception as exc:
            log.warning("Failed to fetch search page %d: %s", page_num, exc)
            break

    log.info("Search returned %d results", len(results))
    return results


async def get_novel_info(novel_url: str) -> Dict[str, Any]:
    """Fetch novel page + AJAX chapter archive and return structured info."""
    client = await _get_client()

    log.info("Fetching novel info: %s", novel_url)
    html = await client.fetch(novel_url, referer=BASE_URL + "/")
    soup = BeautifulSoup(html, "lxml")

    slug = novel_url.rstrip("/").split("/")[-1]

    # Title
    title = ""
    for sel in ["h3.title", ".book h3", "h1", "h3"]:
        el = soup.select_one(sel)
        if el:
            title = el.get_text(strip=True)
            if title:
                break

    # Author
    author = ""
    author_header = soup.find(string=re.compile(r"Author", re.IGNORECASE))
    if author_header:
        parent = getattr(author_header, "parent", None)
        if parent:
            link = parent.find("a", href=re.compile(r"/a/"))
            if link:
                author = link.get_text(strip=True)
            else:
                nxt = parent.find_next_sibling()
                if nxt:
                    link = nxt.find("a", href=re.compile(r"/a/"))
                    if link:
                        author = link.get_text(strip=True)
    if not author:
        links = soup.select("a[href*='/a/']")
        if links:
            author = links[0].get_text(strip=True)

    # Cover
    cover = ""
    for sel in [".book img", ".novel-img img", "img.cover"]:
        img = soup.select_one(sel)
        if img:
            cover = img.get("src", "") or img.get("data-src", "")
            if cover:
                break
    if not cover:
        cover = f"https://images.novelbin.com/novel/{slug}.jpg"

    # Genres
    genres: List[str] = []
    for gl in soup.select("a[href*='/genre/']"):
        g = gl.get_text(strip=True)
        if g and g not in genres:
            genres.append(g)

    # Rating
    rating = ""
    rating_el = soup.find(string=re.compile(r"Rating.*?[\d.]+"))
    if rating_el:
        m = re.search(r"([\d.]+)\s*/\s*10", str(rating_el))
        if m:
            rating = m.group(1)

    # Description
    description = ""
    for sel in [
        ".desc-text",
        ".description",
        "#editdescription",
        ".novel-description",
    ]:
        el = soup.select_one(sel)
        if el:
            description = el.get_text(strip=True)
            if description:
                break
    if not description:
        dh = soup.find(string=re.compile(r"Description", re.IGNORECASE))
        if dh and getattr(dh, "parent", None):
            nxt = dh.parent.find_next("p")
            if nxt:
                description = nxt.get_text(strip=True)

    # Chapters (AJAX archive)
    chapters: List[Dict[str, Any]] = []
    try:
        ajax_url = f"{BASE_URL}/ajax/chapter-archive?novelId={slug}"
        await asyncio.sleep(random.uniform(0.3, 0.8))
        chapter_html = await client.fetch(ajax_url, referer=novel_url)
        chapters = _parse_chapter_list(chapter_html, slug)
    except Exception as exc:
        log.warning("AJAX chapter archive failed: %s – falling back to page", exc)
        chapters = _parse_chapter_list(html, slug)

    return {
        "title": title or slug.replace("-", " ").title(),
        "author": author,
        "cover": cover,
        "genres": genres,
        "rating": rating,
        "description": description,
        "chapters": chapters,
        "total_chapters": len(chapters),
        "url": novel_url,
    }


async def fetch_chapter_content(
    client_: ResilientClient, chapter_url: str
) -> str:
    """Fetch a single chapter's reading content (clean HTML)."""
    try:
        html = await client_.fetch(chapter_url, referer=BASE_URL + "/")
        soup = BeautifulSoup(html, "lxml")

        content_el = None
        for sel in [
            "#chr-content",
            "#chapter-content",
            ".chr-c",
            ".chapter-c",
            "#content",
            ".text-left",
            ".chapter-content",
            ".reading-content",
            ".entry-content",
        ]:
            content_el = soup.select_one(sel)
            if content_el:
                break

        if not content_el:
            best, best_len = None, 0
            for div in soup.find_all("div"):
                if div.find("header") or div.find("nav"):
                    continue
                tl = len(div.get_text(strip=True))
                if tl > best_len:
                    best_len = tl
                    best = div
            content_el = best

        if not content_el:
            return "<p>Chapter content could not be loaded.</p>"

        for tag in content_el.find_all(
            ["script", "style", "iframe", "ins", "noscript", "svg", "canvas"]
        ):
            tag.decompose()
        for a in content_el.find_all(
            "a", href=re.compile(r"(chapter|prev|next)", re.IGNORECASE)
        ):
            a.decompose()
        ad_pat = re.compile(
            r"(ads?[-_]|adsbygoogle|banner|sponsor|chapter-nav|chapter-end|"
            r"bot-next|chapter-action|chapternav)",
            re.IGNORECASE,
        )
        for div in content_el.find_all("div"):
            cls = " ".join(div.get("class", []))
            did = div.get("id", "")
            if ad_pat.search(cls) or ad_pat.search(did):
                div.decompose()

        raw = str(content_el)
        cleaned = clean_html(raw)

        if not cleaned.strip():
            text = content_el.get_text(separator="\n")
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            cleaned = "\n".join(f"<p>{p}</p>" for p in lines)

        return cleaned

    except Exception as exc:
        log.error("Error fetching chapter %s: %s", chapter_url, exc)
        return f"<p>Error loading chapter: {exc}</p>"


async def fetch_all_chapters(
    chapters: List[Dict[str, Any]],
    progress_callback: Optional[Callable] = None,
) -> List[Dict[str, str]]:
    """
    Fetch all chapters concurrently with semaphore-based rate limiting.
    Uses the shared ResilientClient for TLS impersonation + retry.
    """
    client = await _get_client()
    # Low concurrency to avoid 429 rate-limits
    semaphore = asyncio.Semaphore(2)
    results: List[Optional[Dict[str, str]]] = [None] * len(chapters)
    consecutive_errors = 0

    async def _fetch_one(idx: int, ch: Dict[str, Any]) -> None:
        nonlocal consecutive_errors
        async with semaphore:
            # Adaptive delay: longer waits after recent errors
            base_delay = 0.5 if consecutive_errors == 0 else min(2.0 + consecutive_errors, 8.0)
            await asyncio.sleep(random.uniform(base_delay, base_delay + 1.0))

            content = await fetch_chapter_content(client, ch["url"])
            if "Error loading chapter" in content:
                consecutive_errors += 1
            else:
                consecutive_errors = max(0, consecutive_errors - 1)

            results[idx] = {"title": ch["title"], "content": content}
            if progress_callback:
                await progress_callback(idx, ch["title"])

    # Smaller batches to stay under rate limits
    batch_size = 5
    for start in range(0, len(chapters), batch_size):
        end = min(start + batch_size, len(chapters))
        tasks = [_fetch_one(i, chapters[i]) for i in range(start, end)]
        await asyncio.gather(*tasks, return_exceptions=True)
        if end < len(chapters):
            await asyncio.sleep(random.uniform(1.0, 3.0))

    out: List[Dict[str, str]] = []
    for r in results:
        if r is not None:
            out.append(r)
        else:
            out.append(
                {
                    "title": "Failed Chapter",
                    "content": "<p>This chapter could not be loaded.</p>",
                }
            )
    return out


# ---------------------------------------------------------------------------
# HTML parsers
# ---------------------------------------------------------------------------


def _parse_search_page(html: str) -> Tuple[List[Dict[str, Any]], int]:
    """Parse a novelbin search results page -> (results, total_pages)."""
    soup = BeautifulSoup(html, "lxml")
    results: List[Dict[str, Any]] = []
    total_pages = 1

    items = (
        soup.select(".list-novel .row")
        or soup.select(".novel-list .novel-item")
        or soup.select(".col-novel-main .list-novel .row")
        or soup.select("div.list-novel > div.row")
        or soup.select(".search-content .row")
    )

    if not items:
        for h3 in soup.find_all("h3"):
            link = h3.find("a", href=re.compile(r"/b/"))
            if not link:
                continue
            novel_url = urljoin(BASE_URL, link.get("href", ""))
            title = link.get_text(strip=True)
            if not title:
                continue
            slug = novel_url.rstrip("/").split("/")[-1]
            parent = h3.parent

            cover = ""
            if parent:
                img = parent.find("img")
                if img:
                    cover = img.get("src", "") or img.get("data-src", "")
            cover = cover or f"https://images.novelbin.com/novel/{slug}.jpg"

            author = ""
            if parent:
                al = parent.find("a", href=re.compile(r"/a/"))
                if al:
                    author = al.get_text(strip=True)

            results.append(
                {
                    "title": title,
                    "url": novel_url,
                    "cover": cover,
                    "author": author,
                    "genres": [],
                    "rating": "",
                    "chapter_count": "",
                    "slug": slug,
                }
            )

    if not results:
        for item in items:
            try:
                title_el = item.select_one(
                    "h3 a, .novel-title a, a.title"
                ) or item.find("a", href=re.compile(r"/b/"))
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                url = urljoin(BASE_URL, title_el.get("href", ""))
                slug = url.rstrip("/").split("/")[-1]

                img_el = item.find("img")
                cover = ""
                if img_el:
                    cover = img_el.get("src", "") or img_el.get("data-src", "")
                cover = cover or f"https://images.novelbin.com/novel/{slug}.jpg"

                author = ""
                ae = item.find("span", class_="author") or item.find(
                    string=re.compile(r"\u270F")
                )
                if ae:
                    author = (
                        ae.get_text(strip=True).replace("\u270F", "").strip()
                        if hasattr(ae, "get_text")
                        else str(ae).replace("\u270F", "").strip()
                    )

                genres = [
                    gl.get_text(strip=True)
                    for gl in item.select("a[href*='/genre/']")
                ]

                results.append(
                    {
                        "title": title,
                        "url": url,
                        "cover": cover,
                        "author": author,
                        "genres": genres,
                        "rating": "",
                        "chapter_count": "",
                        "slug": slug,
                    }
                )
            except Exception:
                continue

    for a in soup.select(".pagination li a, .paginator a"):
        t = a.get_text(strip=True)
        if t.isdigit():
            total_pages = max(total_pages, int(t))

    return results, total_pages


def _parse_chapter_list(
    html: str, novel_slug: str
) -> List[Dict[str, Any]]:
    """Parse chapter links from AJAX archive or novel page."""
    soup = BeautifulSoup(html, "lxml")
    chapters: List[Dict[str, Any]] = []
    seen: set = set()

    for link in soup.find_all(
        "a", href=re.compile(rf"/b/{re.escape(novel_slug)}/")
    ):
        href = link.get("href", "")
        url = urljoin(BASE_URL, href)
        if url in seen:
            continue
        if url.rstrip("/") == f"{BASE_URL}/b/{novel_slug}":
            continue
        title = link.get_text(strip=True)
        if not title:
            continue
        seen.add(url)
        chapters.append({"index": len(chapters), "title": title, "url": url})

    return chapters
