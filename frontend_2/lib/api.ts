import type {
  NovelResult,
  NovelInfo,
  GenerateRequest,
  DictionaryResult,
} from "./types";

/**
 * API client for NovelGrab.
 *
 * Routes all requests through the Node.js API (THE BRAIN).
 * The Node API handles:
 *   - Cache-first chapter serving
 *   - BullMQ job orchestration
 *   - Proxying to Python scraper
 *   - Object storage management
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Existing Endpoints (backwards-compatible) ─────────────────────

export async function searchNovels(query: string): Promise<NovelResult[]> {
  const res = await fetch(
    `${API_BASE}/api/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || data.detail || "Search failed");
  }
  const data = await res.json();
  return data.results;
}

export async function getChapters(url: string): Promise<NovelInfo> {
  const res = await fetch(
    `${API_BASE}/api/chapters?url=${encodeURIComponent(url)}`,
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error?.message || data.detail || "Failed to fetch chapters",
    );
  }
  return res.json();
}

export async function fetchChapterContent(chapterUrl: string): Promise<string> {
  const res = await fetch(
    `${API_BASE}/api/chapter-content?url=${encodeURIComponent(chapterUrl)}`,
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error?.message || data.detail || "Failed to fetch chapter content",
    );
  }
  const data = await res.json();
  return data.content;
}

export async function generateEpub(
  req: GenerateRequest,
): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error?.message || data.detail || "Failed to start generation",
    );
  }
  return res.json();
}

export function getProgressUrl(jobId: string): string {
  return `${API_BASE}/api/progress/${jobId}`;
}

export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/api/download/${jobId}`;
}

// ─── NEW Endpoints (cache-first + BullMQ) ──────────────────────────

/**
 * Read a chapter with cache-first strategy.
 * Returns instantly if cached, otherwise fetches + caches.
 * Also triggers prefetch for next N chapters.
 */
export async function readChapterCached(
  slug: string,
  chapterNumber: number,
): Promise<{ content: string; title: string; cached: boolean }> {
  const res = await fetch(
    `${API_BASE}/api/read/${encodeURIComponent(slug)}/${chapterNumber}`,
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to read chapter");
  }
  return res.json();
}

/**
 * Trigger an artifact (EPUB) download build.
 * Returns status: 'ready' with downloadUrl, or 'preparing' with jobId.
 */
export async function triggerDownload(
  slug: string,
): Promise<{ status: string; downloadUrl?: string; jobId?: string }> {
  const res = await fetch(
    `${API_BASE}/api/download/${encodeURIComponent(slug)}`,
    {
      method: "POST",
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to trigger download");
  }
  return res.json();
}

/**
 * Get artifact/download status for a novel.
 */
export async function getArtifactStatus(slug: string): Promise<{
  downloadStatus: string;
  downloadUrl: string;
  cachedChapters: number;
  totalChapters: number;
  cacheProgress: number;
}> {
  const res = await fetch(
    `${API_BASE}/api/artifact-status/${encodeURIComponent(slug)}`,
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to get artifact status");
  }
  return res.json();
}

/**
 * Get popular novels sorted by engagement.
 */
export async function getPopularNovels(
  limit: number = 20,
): Promise<{ novels: NovelResult[]; total: number }> {
  const res = await fetch(`${API_BASE}/api/popular?limit=${limit}`);
  if (!res.ok) {
    return { novels: [], total: 0 };
  }
  return res.json();
}

/**
 * Health check for all services.
 */
export async function healthCheck(): Promise<{
  status: string;
  checks: Record<string, string>;
}> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

// ─── Dictionary ────────────────────────────────────────────────────

export async function lookupWord(word: string): Promise<DictionaryResult> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    );
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    const entry = data[0];
    return {
      word: entry.word,
      phonetic:
        entry.phonetic ||
        entry.phonetics?.find((p: { text?: string }) => p.text)?.text ||
        "",
      meanings: (entry.meanings || []).map(
        (m: {
          partOfSpeech: string;
          definitions: { definition: string; example?: string }[];
        }) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: m.definitions
            .slice(0, 3)
            .map((d: { definition: string; example?: string }) => ({
              definition: d.definition,
              example: d.example,
            })),
        }),
      ),
    };
  } catch {
    // Fallback to backend proxy (through Node API)
    const res = await fetch(
      `${API_BASE}/api/dictionary/${encodeURIComponent(word)}`,
    );
    if (!res.ok) throw new Error("Word not found");
    return res.json();
  }
}
