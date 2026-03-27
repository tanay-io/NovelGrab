"""
NovelGrab – Production-grade async scraper v2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROOT CAUSE OF AWS 403 ERRORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AWS EC2 IPs are in well-known datacenter CIDR ranges that Cloudflare
and modern WAFs fingerprint at the IP-reputation layer – BEFORE any
HTTP header or TLS fingerprint is checked. curl_cffi and cloudscraper
only spoof browser TLS/headers; they do NOT fix IP reputation.

Fix: use Playwright (real Chromium) which executes JavaScript,
solves CF Turnstile/UAM challenges via real DOM execution, and
maintains a true browser fingerprint including canvas, WebGL, etc.
Playwright is the only reliable option for datacenter IPs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BYPASS STRATEGY STACK (in priority order)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Playwright  – real Chromium with stealth patches (primary, best bypass)
  2. curl_cffi   – TLS fingerprint impersonation (fast, good for soft blocks)
  3. cloudscraper– CF JS challenge solver (fallback)
  4. httpx       – plain async HTTP (last resort)

Each engine is wrapped in a CircuitBreaker: after N consecutive
failures the engine is "opened" for a cooldown window before retrying.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DUAL SOURCE ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Primary  : novelbin.com
  Secondary: novelfull.com  (automatic failover when primary fails)

Dependencies to install:
  pip install playwright curl_cffi cloudscraper httpx beautifulsoup4 lxml
  playwright install chromium
  playwright install-deps chromium    # on Ubuntu/EC2

  # Optional stealth patch (highly recommended):
  pip install playwright-stealth
"""

from __future__ import annotations

import asyncio
import logging
import random
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Dict, List, Optional, Tuple
from urllib.parse import quote, urljoin

from bs4 import BeautifulSoup

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
# Clean HTML utility (inline – remove dep on external utils module)
# ---------------------------------------------------------------------------

def clean_html(raw: str) -> str:
    """Strip boilerplate while preserving paragraph structure."""
    soup = BeautifulSoup(raw, "lxml")
    for tag in soup.find_all(["script", "style", "noscript", "iframe"]):
        tag.decompose()
    paragraphs = []
    for p in soup.find_all(["p", "br"]):
        text = p.get_text(separator=" ", strip=True)
        if text:
            paragraphs.append(f"<p>{text}</p>")
    return "\n".join(paragraphs) if paragraphs else soup.get_text(separator="\n")


# ---------------------------------------------------------------------------
# Source definitions
# ---------------------------------------------------------------------------

class Source(Enum):
    NOVELBIN  = auto()
    NOVELFULL = auto()


SOURCE_BASES: Dict[Source, str] = {
    Source.NOVELBIN:  "https://novelbin.com",
    Source.NOVELFULL: "https://novelfull.com",
}


# ---------------------------------------------------------------------------
# User-Agent / Header helpers
# ---------------------------------------------------------------------------

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

_IMPERSONATE_TARGETS = [
    "chrome124", "chrome123", "chrome120", "chrome119",
    "edge101", "safari17_0", "safari15_5",
]


def _random_ua() -> str:
    return random.choice(_USER_AGENTS)


def _browser_headers(ua: str, referer: str = "https://novelbin.com/") -> Dict[str, str]:
    return {
        "User-Agent":                ua,
        "Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language":           "en-US,en;q=0.9",
        "Accept-Encoding":           "gzip, deflate, br, zstd",
        "Referer":                   referer,
        "DNT":                       "1",
        "Connection":                "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest":            "document",
        "Sec-Fetch-Mode":            "navigate",
        "Sec-Fetch-Site":            "same-origin",
        "Sec-Fetch-User":            "?1",
        "Sec-CH-UA":                 '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-CH-UA-Mobile":          "?0",
        "Sec-CH-UA-Platform":        '"Windows"',
        "Cache-Control":             "max-age=0",
        "Pragma":                    "no-cache",
    }


# ---------------------------------------------------------------------------
# Circuit Breaker
# ---------------------------------------------------------------------------

class CircuitState(Enum):
    CLOSED   = auto()   # normal – requests flow through
    OPEN     = auto()   # tripped – requests rejected immediately
    HALF_OPEN = auto()  # recovery probe


@dataclass
class CircuitBreaker:
    """
    Standard circuit-breaker pattern.
    Opens after `failure_threshold` consecutive failures,
    resets after `recovery_timeout` seconds.
    """
    name:              str
    failure_threshold: int   = 3
    recovery_timeout:  float = 60.0

    _failures:    int         = field(default=0,      init=False, repr=False)
    _state:       CircuitState= field(default=CircuitState.CLOSED, init=False, repr=False)
    _opened_at:   float       = field(default=0.0,    init=False, repr=False)

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            if time.monotonic() - self._opened_at >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                log.info("[CB:%s] → HALF_OPEN (probing)", self.name)
        return self._state

    def allow(self) -> bool:
        return self.state != CircuitState.OPEN

    def record_success(self) -> None:
        self._failures = 0
        if self._state != CircuitState.CLOSED:
            log.info("[CB:%s] → CLOSED (recovered)", self.name)
        self._state = CircuitState.CLOSED

    def record_failure(self) -> None:
        self._failures += 1
        if self._failures >= self.failure_threshold and self._state == CircuitState.CLOSED:
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()
            log.warning(
                "[CB:%s] → OPEN after %d failures (cooldown %.0fs)",
                self.name, self._failures, self.recovery_timeout,
            )
        elif self._state == CircuitState.HALF_OPEN:
            # Probe failed → back to OPEN
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()
            log.warning("[CB:%s] probe failed → OPEN again", self.name)


# ---------------------------------------------------------------------------
# Transport engines (abstract base + implementations)
# ---------------------------------------------------------------------------

class _TransportEngine(ABC):
    name: str = "base"
    _cb: CircuitBreaker

    @abstractmethod
    async def get(self, url: str, *, headers: dict, timeout: float = 30) -> str:
        ...

    async def close(self) -> None:
        pass

    @property
    def circuit(self) -> CircuitBreaker:
        return self._cb


# ── Engine 1: Playwright (real Chromium + stealth) ─────────────────────────

class _PlaywrightEngine(_TransportEngine):
    """
    Full headless Chromium via Playwright.

    Why this beats curl_cffi on datacenter IPs:
    • Executes real JavaScript → passes CF Turnstile / UAM interstitials
    • Real WebGL/Canvas fingerprints → bypasses browser fingerprinting
    • Genuine TCP/TLS stack (Chrome's BoringSSL) → passes JA3/JA4 checks
    • playwright-stealth patches additional automation signals

    AWS gotcha: install deps with:
        playwright install-deps chromium
    Or on Ubuntu: apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0
                  libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1
                  libxfixes3 libxrandr2 libgbm1 libasound2
    """
    name = "playwright"

    def __init__(self) -> None:
        self._cb = CircuitBreaker(name="playwright", failure_threshold=4, recovery_timeout=120.0)
        self._playwright = None
        self._browser    = None
        self._context    = None
        log.info("Playwright engine: pending async init")

    async def _async_init(self) -> None:
        if self._browser is not None:
            return
        from playwright.async_api import async_playwright  # type: ignore
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",        # critical for EC2 low-memory
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",               # safer in container/EC2
                "--disable-gpu",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
            ],
        )
        self._context = await self._browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=_random_ua(),
            locale="en-US",
            timezone_id="America/New_York",
            # Spoof geolocation to a US city
            geolocation={"latitude": 40.7128, "longitude": -74.0060},
            permissions=["geolocation"],
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9",
            },
        )

        # Apply playwright-stealth if available (hides navigator.webdriver etc.)
        try:
            from playwright_stealth import stealth_async  # type: ignore
            # Stealth is applied per-page, not context; store flag
            self._stealth = True
            log.info("playwright-stealth: available ✓")
        except ImportError:
            self._stealth = False
            log.warning(
                "playwright-stealth not installed – bot signals may leak. "
                "Install with: pip install playwright-stealth"
            )

        log.info("Playwright engine: Chromium launched (headless)")

    async def get(self, url: str, *, headers: dict, timeout: float = 30) -> str:
        await self._async_init()
        page = await self._context.new_page()

        if getattr(self, "_stealth", False):
            from playwright_stealth import stealth_async  # type: ignore
            await stealth_async(page)

        try:
            # Wait for networkidle so CF challenges fully resolve
            response = await page.goto(
                url,
                wait_until="networkidle",
                timeout=int(timeout * 1000),
            )
            # Extra wait if CF interstitial detected
            content = await page.content()
            if _looks_like_cf_challenge(content):
                log.debug("CF challenge detected – waiting extra 8s")
                await page.wait_for_timeout(8000)
                content = await page.content()

            if response and response.status >= 400:
                raise RuntimeError(f"HTTP Error {response.status}: {url}")

            return content
        finally:
            await page.close()

    async def close(self) -> None:
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._context = self._browser = self._playwright = None
        log.info("Playwright engine: closed")


# ── Engine 2: curl_cffi ────────────────────────────────────────────────────

class _CurlCffiEngine(_TransportEngine):
    name = "curl_cffi"

    def __init__(self) -> None:
        self._cb = CircuitBreaker(name="curl_cffi", failure_threshold=3, recovery_timeout=60.0)
        from curl_cffi.requests import AsyncSession  # type: ignore
        self._target  = random.choice(_IMPERSONATE_TARGETS)
        self._session = AsyncSession(impersonate=self._target, verify=False)
        log.info("curl_cffi engine initialised (impersonate=%s)", self._target)

    async def get(self, url: str, *, headers: dict, timeout: float = 30) -> str:
        resp = await self._session.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        return resp.text

    async def close(self) -> None:
        await self._session.close()


# ── Engine 3: cloudscraper ─────────────────────────────────────────────────

class _CloudScraperEngine(_TransportEngine):
    name = "cloudscraper"

    def __init__(self) -> None:
        self._cb = CircuitBreaker(name="cloudscraper", failure_threshold=3, recovery_timeout=60.0)
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
            lambda: self._scraper.get(url, headers=headers, timeout=timeout, allow_redirects=True),
        )
        resp.raise_for_status()
        return resp.text

    async def close(self) -> None:
        self._scraper.close()


# ── Engine 4: httpx (last resort) ─────────────────────────────────────────

class _HttpxEngine(_TransportEngine):
    name = "httpx"

    def __init__(self) -> None:
        self._cb = CircuitBreaker(name="httpx", failure_threshold=5, recovery_timeout=30.0)
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
# Helpers
# ---------------------------------------------------------------------------

def _looks_like_cf_challenge(html: str) -> bool:
    """Detect Cloudflare challenge / WAF block pages."""
    if len(html) < 1200:
        lower = html.lower()
        signals = [
            "just a moment", "checking your browser", "access denied",
            "enable javascript", "cf-browser-verification", "cloudflare",
            "captcha", "ray id", "bot detection", "turnstile",
        ]
        return any(s in lower for s in signals)
    return False


def _http_status(exc: Exception) -> int:
    """Extract HTTP status code from any exception across all engines."""
    # httpx / requests-style
    resp = getattr(exc, "response", None)
    if resp is not None:
        for attr in ("status_code", "status"):
            code = getattr(resp, attr, None)
            if isinstance(code, int):
                return code
    # String parsing fallback: "HTTP Error 403:" or "403 Client Error"
    for m in re.finditer(r"\b(4\d\d|5\d\d)\b", str(exc)):
        return int(m.group(1))
    return 0


# ---------------------------------------------------------------------------
# ResilientClient – orchestrates engines + retry + circuit breakers
# ---------------------------------------------------------------------------

class ResilientClient:
    """
    Production HTTP client with:
      - 4-engine waterfall with circuit breakers
      - Jittered exponential backoff (4 attempts total across engines)
      - 429 global cooldown
      - Atomic engine rotation (serialised)
      - Session warm-up for cookie seeding
    """

    _MAX_RETRIES   = 4
    _BACKOFF_BASE  = 2.0
    _BACKOFF_MAX   = 25.0

    def __init__(self, base_url: str = "https://novelbin.com") -> None:
        self._base_url        = base_url
        self._engine_idx      = 0                      # current position in waterfall
        self._engine_version  = 0                      # bumped on rotation
        self._ua              = _random_ua()
        self._warmed          = False
        self._lock            = asyncio.Lock()
        self._rotate_lock     = asyncio.Lock()
        self._cooldown_until  = 0.0
        self._engines: List[_TransportEngine] = []

    # ── engine pool ────────────────────────────────────────────────────────

    async def _build_engine_pool(self) -> None:
        """Build the waterfall engine list – Playwright first, others follow."""
        pool: List[_TransportEngine] = []

        # 1. Playwright (most powerful on DC IPs)
        try:
            eng = _PlaywrightEngine()
            await eng._async_init()
            pool.append(eng)
            log.info("Engine pool: Playwright ✓")
        except Exception as exc:
            log.warning("Playwright unavailable: %s", exc)

        # 2. curl_cffi
        try:
            pool.append(_CurlCffiEngine())
            log.info("Engine pool: curl_cffi ✓")
        except Exception as exc:
            log.warning("curl_cffi unavailable: %s", exc)

        # 3. cloudscraper
        try:
            pool.append(_CloudScraperEngine())
            log.info("Engine pool: cloudscraper ✓")
        except Exception as exc:
            log.warning("cloudscraper unavailable: %s", exc)

        # 4. httpx (always available)
        pool.append(_HttpxEngine())
        log.info("Engine pool: httpx ✓")

        self._engines = pool
        log.info("Engine pool ready (%d engines)", len(pool))

    async def _ensure_engines(self) -> None:
        if not self._engines:
            async with self._lock:
                if not self._engines:
                    await self._build_engine_pool()

    def _next_open_engine(self, start: int = 0) -> Optional[Tuple[int, _TransportEngine]]:
        """Return (idx, engine) for the next engine whose circuit is not OPEN."""
        for i in range(start, len(self._engines)):
            eng = self._engines[i]
            if eng.circuit.allow():
                return i, eng
        # All open → try from beginning (fallback)
        for i in range(len(self._engines)):
            eng = self._engines[i]
            if eng.circuit.allow():
                return i, eng
        return None

    # ── warm-up ────────────────────────────────────────────────────────────

    async def warm_up(self) -> None:
        if self._warmed:
            return
        await self._ensure_engines()
        result = self._next_open_engine()
        if result is None:
            return
        idx, eng = result
        try:
            headers = _browser_headers(self._ua)
            await eng.get(self._base_url, headers=headers, timeout=25)
            eng.circuit.record_success()
            self._warmed = True
            log.info("Warm-up OK via %s", eng.name)
            await asyncio.sleep(random.uniform(0.5, 1.5))
        except Exception as exc:
            eng.circuit.record_failure()
            log.warning("Warm-up failed via %s: %s", eng.name, exc)

    # ── global cooldown ────────────────────────────────────────────────────

    async def _wait_cooldown(self) -> None:
        now = time.monotonic()
        if now < self._cooldown_until:
            wait = self._cooldown_until - now
            log.debug("Global 429 cooldown active – waiting %.1fs", wait)
            await asyncio.sleep(wait)

    def _set_cooldown(self, secs: float) -> None:
        target = time.monotonic() + secs
        if target > self._cooldown_until:
            self._cooldown_until = target
            log.info("Global cooldown set %.1fs", secs)

    # ── core fetch ─────────────────────────────────────────────────────────

    async def fetch(
        self,
        url: str,
        *,
        referer: str = "",
        timeout: float = 45,
    ) -> str:
        await self._ensure_engines()
        referer = referer or self._base_url + "/"
        last_exc: Optional[Exception] = None
        tried: set = set()

        for attempt in range(1, self._MAX_RETRIES + 1):
            await self._wait_cooldown()

            result = self._next_open_engine()
            if result is None:
                raise RuntimeError("All engines have open circuits – cannot fetch")
            idx, engine = result

            headers = _browser_headers(self._ua, referer=referer)

            try:
                if attempt > 1:
                    backoff = min(self._BACKOFF_BASE * (2 ** (attempt - 1)), self._BACKOFF_MAX)
                    jitter  = backoff * random.uniform(0.7, 1.5)
                    log.debug("Retry %d – sleeping %.1fs via %s", attempt, jitter, engine.name)
                    await asyncio.sleep(jitter)

                log.debug("Attempt %d/%d [%s] → %s", attempt, self._MAX_RETRIES, engine.name, url)
                text = await engine.get(url, headers=headers, timeout=timeout)

                if _looks_like_cf_challenge(text):
                    log.warning("CF challenge on attempt %d [%s]", attempt, engine.name)
                    engine.circuit.record_failure()
                    tried.add(idx)
                    self._ua = _random_ua()
                    self._engine_idx = (idx + 1) % len(self._engines)
                    raise RuntimeError("CF block page")

                engine.circuit.record_success()
                return text

            except Exception as exc:
                last_exc  = exc
                status    = _http_status(exc)
                exc_str   = str(exc).lower()
                log.warning(
                    "Fetch attempt %d/%d failed [%s] for %s: %s",
                    attempt, self._MAX_RETRIES, engine.name, url, exc,
                )

                # Session closed → stale engine, just retry with same engine
                if "session is closed" in exc_str or "closed" in exc_str:
                    log.debug("Stale session – will re-acquire")
                    continue

                # 429 → global cooldown + rotate engine
                if status == 429:
                    self._set_cooldown(random.uniform(10.0, 20.0))
                    engine.circuit.record_failure()
                    tried.add(idx)
                    self._ua = _random_ua()
                    continue

                # 403 / 503 → mark failure on circuit breaker, try next engine
                if status in (403, 503):
                    engine.circuit.record_failure()
                    tried.add(idx)
                    self._ua = _random_ua()
                    continue

                # Other HTTP errors
                if status >= 400:
                    engine.circuit.record_failure()
                    tried.add(idx)

        raise RuntimeError(
            f"All {self._MAX_RETRIES} fetch attempts failed for {url}: {last_exc}"
        )

    async def close(self) -> None:
        for eng in self._engines:
            try:
                await eng.close()
            except Exception:
                pass
        self._engines.clear()
        log.info("ResilientClient closed")


# ---------------------------------------------------------------------------
# Module-level client pool – one client per source
# ---------------------------------------------------------------------------

_clients: Dict[Source, ResilientClient] = {}
_client_lock = asyncio.Lock()


async def _get_client(source: Source = Source.NOVELBIN) -> ResilientClient:
    if source not in _clients:
        async with _client_lock:
            if source not in _clients:
                base = SOURCE_BASES[source]
                client = ResilientClient(base_url=base)
                await client.warm_up()
                _clients[source] = client
    return _clients[source]


# ---------------------------------------------------------------------------
# SourceRouter – transparent failover between novelbin and novelfull
# ---------------------------------------------------------------------------

class SourceRouter:
    """
    Routes search / info requests across sources.
    On consecutive failures with source A, promotes source B.
    """
    _FAIL_PROMOTE = 2   # failures before promoting alternate source

    def __init__(self) -> None:
        self._primary   = Source.NOVELBIN
        self._alternate = Source.NOVELFULL
        self._primary_failures = 0

    def _maybe_promote(self) -> None:
        if self._primary_failures >= self._FAIL_PROMOTE:
            log.warning(
                "SourceRouter: %d consecutive primary failures – switching primary to %s",
                self._primary_failures, self._alternate.name,
            )
            self._primary, self._alternate = self._alternate, self._primary
            self._primary_failures = 0

    async def fetch_with_failover(
        self,
        *,
        primary_url:   str,
        alternate_url: str,
        referer:       str = "",
        timeout:       float = 45,
    ) -> Tuple[str, Source]:
        """Returns (html, source_used)."""
        # Try primary
        try:
            client = await _get_client(self._primary)
            html   = await client.fetch(primary_url, referer=referer, timeout=timeout)
            self._primary_failures = 0
            return html, self._primary
        except Exception as exc:
            self._primary_failures += 1
            log.warning("Primary source failed (%s): %s", self._primary.name, exc)
            self._maybe_promote()

        # Failover to alternate
        log.info("Failing over to alternate source: %s", self._alternate.name)
        try:
            client = await _get_client(self._alternate)
            html   = await client.fetch(alternate_url, referer=referer, timeout=timeout)
            return html, self._alternate
        except Exception as exc:
            raise RuntimeError(
                f"Both sources failed. Last error: {exc}"
            ) from exc


_router = SourceRouter()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def search_novels(query: str) -> List[Dict[str, Any]]:
    """Search for novels by query, with automatic source failover."""
    encoded = quote(query)

    nb_url  = f"{SOURCE_BASES[Source.NOVELBIN]}/search?keyword={encoded}"
    nf_url  = f"{SOURCE_BASES[Source.NOVELFULL]}/?s={encoded}&type=novel"

    log.info("Searching query=%r  primary=%s", query, _router._primary.name)
    html, source = await _router.fetch_with_failover(
        primary_url=nb_url,
        alternate_url=nf_url,
        referer=SOURCE_BASES[_router._primary] + "/",
    )

    results, total_pages = _parse_search_page(html, source)

    # Fetch additional result pages (up to 5)
    max_pages = min(total_pages, 5)
    for page_num in range(2, max_pages + 1):
        try:
            if source == Source.NOVELBIN:
                page_url = f"{nb_url}&page={page_num}"
            else:
                page_url = f"{nf_url}&page={page_num}"
            client   = await _get_client(source)
            page_html = await client.fetch(page_url, referer=nb_url if source == Source.NOVELBIN else nf_url)
            page_results, _ = _parse_search_page(page_html, source)
            results.extend(page_results)
            await asyncio.sleep(random.uniform(0.3, 0.9))
        except Exception as exc:
            log.warning("Failed to fetch page %d: %s", page_num, exc)
            break

    log.info("Search returned %d results (source=%s)", len(results), source.name)
    return results


async def get_novel_info(novel_url: str) -> Dict[str, Any]:
    """Fetch novel metadata + chapter list from any supported source URL."""
    source = _detect_source(novel_url)
    client = await _get_client(source)

    log.info("Fetching novel info [%s]: %s", source.name, novel_url)
    html  = await client.fetch(novel_url, referer=SOURCE_BASES[source] + "/")
    slug  = novel_url.rstrip("/").split("/")[-1]

    if source == Source.NOVELBIN:
        return await _parse_novelbin_info(html, novel_url, slug, client)
    else:
        return await _parse_novelfull_info(html, novel_url, slug, client)


async def fetch_chapter_content(
    client_: ResilientClient,
    chapter_url: str,
) -> str:
    """Fetch and clean a single chapter's reading content."""
    source = _detect_source(chapter_url)
    selectors = _chapter_content_selectors(source)

    try:
        html  = await client_.fetch(chapter_url, referer=SOURCE_BASES[source] + "/")
        soup  = BeautifulSoup(html, "lxml")

        content_el = None
        for sel in selectors:
            content_el = soup.select_one(sel)
            if content_el:
                break

        # Fallback: largest div by text length
        if not content_el:
            best, best_len = None, 0
            for div in soup.find_all("div"):
                if div.find("header") or div.find("nav"):
                    continue
                tl = len(div.get_text(strip=True))
                if tl > best_len:
                    best_len, best = tl, div
            content_el = best

        if not content_el:
            return "<p>Chapter content could not be loaded.</p>"

        # Scrub noise
        for tag in content_el.find_all(
            ["script", "style", "iframe", "ins", "noscript", "svg", "canvas"]
        ):
            tag.decompose()
        for a in content_el.find_all("a", href=re.compile(r"(chapter|prev|next)", re.I)):
            a.decompose()
        _ad_pat = re.compile(
            r"(ads?[-_]|adsbygoogle|banner|sponsor|chapter-nav|chapter-end|"
            r"bot-next|chapter-action|chapternav|advertisement)",
            re.I,
        )
        for div in content_el.find_all("div"):
            cls = " ".join(div.get("class", []))
            did = div.get("id", "")
            if _ad_pat.search(cls) or _ad_pat.search(did):
                div.decompose()

        cleaned = clean_html(str(content_el))

        if not cleaned.strip():
            text  = content_el.get_text(separator="\n")
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
    Batch-fetch all chapters with semaphore-based rate limiting.
    Adaptive delay: backs off when errors accumulate.
    """
    if not chapters:
        return []

    source    = _detect_source(chapters[0]["url"])
    client    = await _get_client(source)
    semaphore = asyncio.Semaphore(2)

    results: List[Optional[Dict[str, str]]] = [None] * len(chapters)
    consecutive_errors = 0

    async def _fetch_one(idx: int, ch: Dict[str, Any]) -> None:
        nonlocal consecutive_errors
        async with semaphore:
            base_delay = 0.5 if consecutive_errors == 0 else min(2.0 + consecutive_errors * 0.5, 8.0)
            await asyncio.sleep(random.uniform(base_delay, base_delay + 1.0))

            content = await fetch_chapter_content(client, ch["url"])
            if "Error loading chapter" in content:
                consecutive_errors = min(consecutive_errors + 1, 10)
            else:
                consecutive_errors = max(consecutive_errors - 1, 0)

            results[idx] = {"title": ch["title"], "content": content}
            if progress_callback:
                await progress_callback(idx, ch["title"])

    batch_size = 5
    for start in range(0, len(chapters), batch_size):
        end   = min(start + batch_size, len(chapters))
        tasks = [_fetch_one(i, chapters[i]) for i in range(start, end)]
        await asyncio.gather(*tasks, return_exceptions=True)
        if end < len(chapters):
            await asyncio.sleep(random.uniform(1.5, 3.5))

    return [
        r if r is not None
        else {"title": "Failed Chapter", "content": "<p>This chapter could not be loaded.</p>"}
        for r in results
    ]


# ---------------------------------------------------------------------------
# Source detection
# ---------------------------------------------------------------------------

def _detect_source(url: str) -> Source:
    if "novelfull" in url:
        return Source.NOVELFULL
    return Source.NOVELBIN


# ---------------------------------------------------------------------------
# Per-source chapter content selectors
# ---------------------------------------------------------------------------

def _chapter_content_selectors(source: Source) -> List[str]:
    if source == Source.NOVELFULL:
        return [
            "#chapter-content",
            ".chapter-content",
            "#content",
            ".content-wrap",
            ".reading-content",
            ".text-left",
            ".chapter-c",
        ]
    # novelbin
    return [
        "#chr-content",
        "#chapter-content",
        ".chr-c",
        ".chapter-c",
        "#content",
        ".text-left",
        ".chapter-content",
        ".reading-content",
        ".entry-content",
    ]


# ---------------------------------------------------------------------------
# Novel info parsers
# ---------------------------------------------------------------------------

async def _parse_novelbin_info(
    html: str,
    novel_url: str,
    slug: str,
    client: ResilientClient,
) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")

    # Title
    title = ""
    for sel in ["h3.title", ".book h3", "h1", "h3"]:
        el = soup.select_one(sel)
        if el:
            title = el.get_text(strip=True)
            if title:
                break

    # Author
    author = _extract_author(soup, href_pattern=r"/a/")

    # Cover
    cover = _extract_cover(soup, slug, selectors=[".book img", ".novel-img img", "img.cover"])
    if not cover:
        cover = f"https://images.novelbin.com/novel/{slug}.jpg"

    # Genres
    genres = [a.get_text(strip=True) for a in soup.select("a[href*='/genre/']") if a.get_text(strip=True)]

    # Rating
    rating = ""
    for el in soup.find_all(string=re.compile(r"Rating.*?[\d.]+")):
        m = re.search(r"([\d.]+)\s*/\s*10", str(el))
        if m:
            rating = m.group(1)
            break

    # Description
    description = _extract_description(soup)

    # Chapters via AJAX
    chapters: List[Dict[str, Any]] = []
    try:
        ajax_url    = f"{SOURCE_BASES[Source.NOVELBIN]}/ajax/chapter-archive?novelId={slug}"
        await asyncio.sleep(random.uniform(0.3, 0.8))
        chapter_html = await client.fetch(ajax_url, referer=novel_url)
        chapters     = _parse_chapter_list_novelbin(chapter_html, slug)
    except Exception as exc:
        log.warning("AJAX chapter archive failed: %s – falling back to page parse", exc)
        chapters = _parse_chapter_list_novelbin(html, slug)

    return {
        "title":          title or slug.replace("-", " ").title(),
        "author":         author,
        "cover":          cover,
        "genres":         genres,
        "rating":         rating,
        "description":    description,
        "chapters":       chapters,
        "total_chapters": len(chapters),
        "url":            novel_url,
        "source":         Source.NOVELBIN.name,
    }


async def _parse_novelfull_info(
    html: str,
    novel_url: str,
    slug: str,
    client: ResilientClient,
) -> Dict[str, Any]:
    """
    Novelfull.com novel page parser.

    Typical URL pattern : https://novelfull.com/novel-slug.html
    Chapter list        : paginated at /novel-slug.html?page=N
    Chapter URL pattern : /novel-slug/chapter-N-title.html
    """
    soup = BeautifulSoup(html, "lxml")

    # Title – <h3 class="title"> or <h1>
    title = ""
    for sel in ["h3.title", "h1.novel-title", "h1", "h3"]:
        el = soup.select_one(sel)
        if el:
            title = el.get_text(strip=True)
            if title:
                break

    # Author – linked inside info block
    author = _extract_author(soup, href_pattern=r"/author/")
    if not author:
        author = _extract_author(soup, href_pattern=r"/a/")

    # Cover
    cover = _extract_cover(soup, slug, selectors=[".book img", ".info-holder img", "img.cover", "img[src*='novel']"])
    if not cover:
        cover = f"https://novelfull.com/uploads/thumbs/{slug}.jpg"

    # Genres – novelfull uses /genre/ or /category/ links
    genres = list({
        a.get_text(strip=True)
        for a in soup.select("a[href*='/genre/'], a[href*='/category/']")
        if a.get_text(strip=True)
    })

    # Rating – novelfull shows a star rating widget
    rating = ""
    rating_el = soup.select_one("[itemprop='ratingValue']")
    if rating_el:
        rating = rating_el.get_text(strip=True)

    # Description
    description = _extract_description(soup)

    # Chapters – paginated list pages
    chapters: List[Dict[str, Any]] = []
    base = SOURCE_BASES[Source.NOVELFULL]

    # Parse current page for total pages
    total_pages = 1
    for a in soup.select(".pagination li a, .paginator a, ul.pagination a"):
        t = a.get_text(strip=True)
        if t.isdigit():
            total_pages = max(total_pages, int(t))
    # Also check data-max attribute
    last_btn = soup.select_one("li.last a[data-page]")
    if last_btn:
        try:
            total_pages = max(total_pages, int(last_btn["data-page"]) + 1)
        except (ValueError, KeyError):
            pass

    chapters.extend(_parse_chapter_list_novelfull(html, slug, base))

    for page_num in range(2, total_pages + 1):
        try:
            page_url  = f"{novel_url}?page={page_num}"
            page_html = await client.fetch(page_url, referer=novel_url)
            chapters.extend(_parse_chapter_list_novelfull(page_html, slug, base))
            await asyncio.sleep(random.uniform(0.3, 0.8))
        except Exception as exc:
            log.warning("Failed to fetch chapter page %d: %s", page_num, exc)
            break

    return {
        "title":          title or slug.replace("-", " ").title(),
        "author":         author,
        "cover":          cover,
        "genres":         genres,
        "rating":         rating,
        "description":    description,
        "chapters":       chapters,
        "total_chapters": len(chapters),
        "url":            novel_url,
        "source":         Source.NOVELFULL.name,
    }


# ---------------------------------------------------------------------------
# Shared extraction helpers
# ---------------------------------------------------------------------------

def _extract_author(soup: BeautifulSoup, href_pattern: str) -> str:
    # Strategy 1: first link matching the href pattern
    link = soup.find("a", href=re.compile(href_pattern))
    if link:
        return link.get_text(strip=True)
    # Strategy 2: sibling of "Author" text node
    header = soup.find(string=re.compile(r"Author", re.I))
    if header and getattr(header, "parent", None):
        parent = header.parent
        link   = parent.find("a")
        if link:
            return link.get_text(strip=True)
        nxt = parent.find_next_sibling()
        if nxt:
            link = nxt.find("a")
            if link:
                return link.get_text(strip=True)
    return ""


def _extract_cover(soup: BeautifulSoup, slug: str, selectors: List[str]) -> str:
    for sel in selectors:
        img = soup.select_one(sel)
        if img:
            src = img.get("src", "") or img.get("data-src", "")
            if src:
                return src
    return ""


def _extract_description(soup: BeautifulSoup) -> str:
    for sel in [".desc-text", ".description", "#editdescription", ".novel-description",
                "[itemprop='description']", ".summary__content", ".summary-content"]:
        el = soup.select_one(sel)
        if el:
            text = el.get_text(strip=True)
            if text:
                return text
    # Last resort: paragraph after "Description" heading
    header = soup.find(string=re.compile(r"Description", re.I))
    if header and getattr(header, "parent", None):
        nxt = header.parent.find_next("p")
        if nxt:
            return nxt.get_text(strip=True)
    return ""


# ---------------------------------------------------------------------------
# HTML parsers
# ---------------------------------------------------------------------------

def _parse_search_page(html: str, source: Source) -> Tuple[List[Dict[str, Any]], int]:
    """Dispatch to per-source search page parser."""
    if source == Source.NOVELFULL:
        return _parse_search_novelfull(html)
    return _parse_search_novelbin(html)


def _parse_search_novelbin(html: str) -> Tuple[List[Dict[str, Any]], int]:
    soup    = BeautifulSoup(html, "lxml")
    results: List[Dict[str, Any]] = []
    total_pages = 1
    base = SOURCE_BASES[Source.NOVELBIN]

    items = (
        soup.select(".list-novel .row")
        or soup.select(".novel-list .novel-item")
        or soup.select("div.list-novel > div.row")
        or soup.select(".search-content .row")
    )

    for item in items:
        try:
            title_el = (
                item.select_one("h3 a, .novel-title a, a.title")
                or item.find("a", href=re.compile(r"/b/"))
            )
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            url   = urljoin(base, title_el.get("href", ""))
            slug  = url.rstrip("/").split("/")[-1]

            img_el = item.find("img")
            cover  = ""
            if img_el:
                cover = img_el.get("src", "") or img_el.get("data-src", "")
            cover = cover or f"https://images.novelbin.com/novel/{slug}.jpg"

            author = ""
            ae = item.find("span", class_="author")
            if ae:
                author = ae.get_text(strip=True).replace("✏", "").strip()

            genres = [gl.get_text(strip=True) for gl in item.select("a[href*='/genre/']")]

            results.append({
                "title": title, "url": url, "cover": cover,
                "author": author, "genres": genres,
                "rating": "", "chapter_count": "", "slug": slug,
                "source": Source.NOVELBIN.name,
            })
        except Exception:
            continue

    # Fallback: scan all h3 links
    if not results:
        for h3 in soup.find_all("h3"):
            link = h3.find("a", href=re.compile(r"/b/"))
            if not link:
                continue
            url  = urljoin(base, link.get("href", ""))
            slug = url.rstrip("/").split("/")[-1]
            results.append({
                "title": link.get_text(strip=True), "url": url,
                "cover": f"https://images.novelbin.com/novel/{slug}.jpg",
                "author": "", "genres": [], "rating": "", "chapter_count": "",
                "slug": slug, "source": Source.NOVELBIN.name,
            })

    for a in soup.select(".pagination li a, .paginator a"):
        t = a.get_text(strip=True)
        if t.isdigit():
            total_pages = max(total_pages, int(t))

    return results, total_pages


def _parse_search_novelfull(html: str) -> Tuple[List[Dict[str, Any]], int]:
    """
    Novelfull search results page parser.

    URL format: https://novelfull.com/?s=QUERY&type=novel
    Item structure: div.col-truyen-main > div.list-truyen > div.row  (same Bootstrap grid as novelbin)
    Each row contains:
      - img.cover inside an anchor
      - h3.truyen-title > a  (title + novel URL)
      - span.author  (author name)
      - span.label-info  (genres / tags)
    """
    soup    = BeautifulSoup(html, "lxml")
    results: List[Dict[str, Any]] = []
    total_pages = 1
    base = SOURCE_BASES[Source.NOVELFULL]

    # Primary selector – mirror novelbin's Bootstrap grid pattern
    items = (
        soup.select("div.list-truyen .row")
        or soup.select("div.list-novel .row")
        or soup.select(".truyen-list .row")
        or soup.select(".col-truyen-main .row")
    )

    for item in items:
        try:
            title_el = (
                item.select_one("h3.truyen-title a")
                or item.select_one("h3 a")
                or item.select_one("a.truyen-title")
                or item.find("a", href=re.compile(r"novelfull\.com/[^/]+\.html"))
            )
            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            href  = title_el.get("href", "")
            url   = href if href.startswith("http") else urljoin(base, href)
            slug  = re.sub(r"\.html$", "", url.rstrip("/").split("/")[-1])

            img_el = item.find("img")
            cover  = ""
            if img_el:
                src = img_el.get("src", "") or img_el.get("data-src", "")
                cover = src if src.startswith("http") else urljoin(base, src)
            cover = cover or f"https://novelfull.com/uploads/thumbs/{slug}.jpg"

            author = ""
            ae = item.find("span", class_="author")
            if ae:
                author = ae.get_text(strip=True).replace("✏", "").strip()

            genres = [
                gl.get_text(strip=True)
                for gl in item.select("a[href*='/genre/'], a[href*='/category/'], span.label-info a")
                if gl.get_text(strip=True)
            ]

            chapter_count = ""
            chap_el = item.select_one(".text-info a, .chapter-count")
            if chap_el:
                chapter_count = chap_el.get_text(strip=True)

            results.append({
                "title": title, "url": url, "cover": cover,
                "author": author, "genres": genres,
                "rating": "", "chapter_count": chapter_count,
                "slug": slug, "source": Source.NOVELFULL.name,
            })
        except Exception:
            continue

    for a in soup.select(".pagination li a, ul.pagination a"):
        t = a.get_text(strip=True)
        if t.isdigit():
            total_pages = max(total_pages, int(t))

    return results, total_pages


def _parse_chapter_list_novelbin(html: str, novel_slug: str) -> List[Dict[str, Any]]:
    soup     = BeautifulSoup(html, "lxml")
    chapters: List[Dict[str, Any]] = []
    seen: set = set()
    base = SOURCE_BASES[Source.NOVELBIN]

    pattern = re.compile(rf"/b/{re.escape(novel_slug)}/")
    for link in soup.find_all("a", href=pattern):
        href  = link.get("href", "")
        url   = urljoin(base, href)
        clean = url.rstrip("/")
        if clean in seen or clean == f"{base}/b/{novel_slug}":
            continue
        title = link.get_text(strip=True)
        if not title:
            continue
        seen.add(clean)
        chapters.append({"index": len(chapters), "title": title, "url": url})

    return chapters


def _parse_chapter_list_novelfull(html: str, novel_slug: str, base: str) -> List[Dict[str, Any]]:
    """
    Novelfull chapter list parser.

    Chapters are in: ul#list-chapter > li > a
    href pattern   : /novel-slug/chapter-N-title.html
    """
    soup     = BeautifulSoup(html, "lxml")
    chapters: List[Dict[str, Any]] = []
    seen: set = set()

    # Primary list structure
    list_items = (
        soup.select("ul#list-chapter li a")
        or soup.select(".list-chapter li a")
        or soup.select(".chapter-list li a")
    )

    slug_esc = re.escape(novel_slug)
    fallback_pattern = re.compile(rf"/{slug_esc}/chapter", re.I)

    candidates = list_items or soup.find_all("a", href=fallback_pattern)

    for link in candidates:
        href  = link.get("href", "")
        if not href or href == "#":
            continue
        url   = href if href.startswith("http") else urljoin(base, href)
        clean = url.rstrip("/")
        if clean in seen:
            continue
        title = link.get_text(strip=True) or link.get("title", "")
        if not title:
            continue
        # Skip "previous" / "next" navigation links
        if re.search(r"\b(prev|next|previous)\b", title, re.I):
            continue
        seen.add(clean)
        chapters.append({"index": len(chapters), "title": title, "url": url})

    return chapters
