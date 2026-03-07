/**
 * NovelGrab – Novel Service
 *
 * Business logic layer for novel operations.
 * Orchestrates between MongoDB, Python scraper, Redis queues, and storage.
 *
 * Responsibilities:
 *   - Search novels (proxy to Python scraper + cache in DB)
 *   - Get novel info + chapter list
 *   - Read chapter (cache-first with queue fallback)
 *   - Enqueue chapter prefetch
 *   - Track engagement (read count, popularity)
 *   - Trigger artifact build
 */

import Novel from "../models/Novel.js";
import Chapter from "../models/Chapter.js";
import { getChapterCacheQueue, getBuildArtifactQueue } from "./queue.js";
import {
  uploadObject,
  downloadObject,
  objectExists,
  chapterStorageKey,
  getObjectUrl,
} from "./storage.js";
import config from "../config/index.js";
import { logger } from "../utils/logger.js";
import { NotFoundError, ServiceUnavailableError } from "../utils/errors.js";

// ─── Search ────────────────────────────────────────────────────────

/**
 * Search novels via the Python scraper backend.
 * Results are proxied and optionally cached in MongoDB.
 */
export async function searchNovels(query) {
  try {
    const resp = await fetch(
      `${config.scraperUrl}/api/search?q=${encodeURIComponent(query)}`,
    );
    if (!resp.ok) throw new Error(`Scraper returned ${resp.status}`);
    const data = await resp.json();

    // Upsert novels into MongoDB for future reference
    if (data.results && data.results.length > 0) {
      const bulkOps = data.results.map((novel) => ({
        updateOne: {
          filter: { slug: novel.slug },
          update: {
            $setOnInsert: {
              title: novel.title,
              author: novel.author || "Unknown Author",
              coverUrl: novel.cover || "",
              genres: novel.genres || [],
              rating: novel.rating || "",
              sourceUrl: novel.url,
              slug: novel.slug,
            },
          },
          upsert: true,
        },
      }));
      await Novel.bulkWrite(bulkOps, { ordered: false }).catch(() => {});
    }

    return data;
  } catch (err) {
    logger.error({ err, query }, "Search failed");
    throw new ServiceUnavailableError("Search service");
  }
}

// ─── Novel Info ────────────────────────────────────────────────────

/**
 * Get full novel info + chapter list.
 * Fetches from Python scraper and syncs to MongoDB.
 */
export async function getNovelInfo(novelUrl) {
  try {
    const resp = await fetch(
      `${config.scraperUrl}/api/chapters?url=${encodeURIComponent(novelUrl)}`,
    );
    if (!resp.ok) throw new Error(`Scraper returned ${resp.status}`);
    const data = await resp.json();

    // Extract slug from URL
    const slug = novelUrl.replace(/\/$/, "").split("/").pop();

    // Upsert novel in MongoDB
    const novel = await Novel.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: data.title,
          author: data.author || "Unknown Author",
          coverUrl: data.cover || "",
          genres: data.genres || [],
          rating: data.rating || "",
          description: data.description || "",
          sourceUrl: data.url || novelUrl,
          totalChapters: data.total_chapters || 0,
        },
      },
      { upsert: true, new: true },
    );

    // Sync chapters to MongoDB
    if (data.chapters && data.chapters.length > 0) {
      const chapterOps = data.chapters.map((ch, idx) => ({
        updateOne: {
          filter: { novelSlug: slug, chapterNumber: idx + 1 },
          update: {
            $setOnInsert: {
              title: ch.title,
              sourceUrl: ch.url,
              novelSlug: slug,
              chapterNumber: idx + 1,
            },
          },
          upsert: true,
        },
      }));
      await Chapter.bulkWrite(chapterOps, { ordered: false }).catch(() => {});
    }

    // Add cache info to response
    const cachedCount = await Chapter.countDocuments({
      novelSlug: slug,
      isCached: true,
    });

    return {
      ...data,
      slug,
      cachedChapters: cachedCount,
      downloadStatus: novel.downloadStatus,
      downloadUrl: novel.downloadUrl,
    };
  } catch (err) {
    logger.error({ err, novelUrl }, "Failed to get novel info");
    throw new ServiceUnavailableError("Novel info service");
  }
}

// ─── Chapter Reading ───────────────────────────────────────────────

/**
 * Read a chapter – CACHE-FIRST strategy.
 *
 * Flow:
 *   1. Check if chapter is cached in object storage
 *   2. If cached → return instantly ⚡
 *   3. If not → fetch via Python scraper, cache it, return
 *   4. Also enqueue prefetch for next N chapters
 */
export async function readChapter(slug, chapterNumber) {
  const storageKey = chapterStorageKey(slug, chapterNumber);

  // 1. Check object storage cache
  const cached = await downloadObject(storageKey);
  if (cached) {
    logger.debug({ slug, chapterNumber }, "Chapter served from cache ⚡");
    const content = JSON.parse(cached.toString());

    // Fire-and-forget: engagement + prefetch
    trackEngagement(slug, chapterNumber).catch(() => {});
    enqueuePrefetch(slug, chapterNumber).catch(() => {});

    return { content: content.html, title: content.title, cached: true };
  }

  // 2. Fetch from Python scraper
  const chapter = await Chapter.findOne({ novelSlug: slug, chapterNumber });
  if (!chapter) {
    throw new NotFoundError(`Chapter ${chapterNumber}`);
  }

  try {
    const resp = await fetch(
      `${config.scraperUrl}/api/chapter-content?url=${encodeURIComponent(chapter.sourceUrl)}`,
    );
    if (!resp.ok) throw new Error(`Scraper returned ${resp.status}`);
    const data = await resp.json();

    // 3. Cache to object storage
    const cacheData = JSON.stringify({
      html: data.content,
      title: chapter.title,
      fetchedAt: new Date().toISOString(),
    });

    await uploadObject(storageKey, cacheData, "application/json");

    // 4. Mark chapter as cached in MongoDB
    await Chapter.updateOne(
      { _id: chapter._id },
      {
        $set: {
          isCached: true,
          storagePath: storageKey,
          storageUrl: await getObjectUrl(storageKey),
          fetchedAt: new Date(),
        },
      },
    );

    // Update cached count on novel
    const cachedCount = await Chapter.countDocuments({
      novelSlug: slug,
      isCached: true,
    });
    await Novel.updateOne(
      { slug },
      { $set: { cachedChaptersCount: cachedCount } },
    );

    // Fire-and-forget: engagement + prefetch
    trackEngagement(slug, chapterNumber).catch(() => {});
    enqueuePrefetch(slug, chapterNumber).catch(() => {});

    return { content: data.content, title: chapter.title, cached: false };
  } catch (err) {
    logger.error({ err, slug, chapterNumber }, "Chapter fetch failed");
    throw err;
  }
}

/**
 * Read a chapter by its source URL (backwards-compatible with existing frontend).
 */
export async function readChapterByUrl(chapterUrl) {
  try {
    const resp = await fetch(
      `${config.scraperUrl}/api/chapter-content?url=${encodeURIComponent(chapterUrl)}`,
    );
    if (!resp.ok) throw new Error(`Scraper returned ${resp.status}`);
    const data = await resp.json();
    return data;
  } catch (err) {
    logger.error({ err, chapterUrl }, "Chapter fetch by URL failed");
    throw err;
  }
}

// ─── Prefetch ──────────────────────────────────────────────────────

/**
 * Enqueue next N chapters for background caching.
 * Only enqueues chapters that aren't already cached.
 */
async function enqueuePrefetch(slug, currentChapter) {
  const ahead = config.prefetchAhead;
  const endChapter = currentChapter + ahead;

  // Find uncached chapters in the prefetch range
  const uncached = await Chapter.find({
    novelSlug: slug,
    chapterNumber: { $gt: currentChapter, $lte: endChapter },
    isCached: false,
  }).lean();

  if (uncached.length === 0) return;

  const queue = getChapterCacheQueue();

  for (const ch of uncached) {
    await queue.add(
      "cache-chapter",
      {
        novelSlug: slug,
        chapterNumber: ch.chapterNumber,
        sourceUrl: ch.sourceUrl,
        title: ch.title,
      },
      {
        jobId: `cache-${slug}-${ch.chapterNumber}`, // Deduplicate
        priority: 10, // Lower priority than user-initiated
      },
    );
  }

  logger.debug(
    { slug, from: currentChapter + 1, to: endChapter, count: uncached.length },
    "Prefetch jobs enqueued",
  );
}

// ─── Engagement Tracking ────────────────────────────────────────────

/**
 * Track user reading engagement.
 * Updates lastReadAt, readCount, and popularityScore.
 */
async function trackEngagement(slug, chapterNumber) {
  await Novel.updateOne(
    { slug },
    {
      $set: { lastReadAt: new Date() },
      $inc: { readCount: 1, popularityScore: 1 },
    },
  );

  // Check if artifact should be triggered
  const novel = await Novel.findOne({ slug }).lean();
  if (
    novel &&
    novel.readCount >= config.artifactTriggerChapters &&
    novel.downloadStatus === "none"
  ) {
    await triggerArtifactBuild(slug);
  }
}

// ─── Artifact Building ──────────────────────────────────────────────

/**
 * Trigger EPUB artifact build.
 *
 * Trigger conditions (any):
 *   - User reads ≥ N chapters
 *   - User clicks download
 *   - User bookmarks
 *   - Manual admin trigger
 */
export async function triggerArtifactBuild(slug) {
  const novel = await Novel.findOne({ slug });
  if (!novel) throw new NotFoundError("Novel");

  // Don't rebuild if already ready or in progress
  if (
    novel.downloadStatus === "ready" ||
    novel.downloadStatus === "preparing"
  ) {
    return {
      status: novel.downloadStatus,
      downloadUrl: novel.downloadUrl,
    };
  }

  // Mark as preparing
  await Novel.updateOne({ slug }, { $set: { downloadStatus: "preparing" } });

  // Enqueue build job
  const queue = getBuildArtifactQueue();
  const job = await queue.add(
    "build-epub",
    {
      novelSlug: slug,
      title: novel.title,
      author: novel.author,
      coverUrl: novel.coverUrl,
    },
    {
      jobId: `artifact-${slug}`, // Deduplicate
    },
  );

  logger.info({ slug, jobId: job.id }, "Artifact build job enqueued");

  return { status: "preparing", jobId: job.id };
}

/**
 * Generate EPUB via Python backend (backwards-compatible).
 * Proxies the request to the existing FastAPI generate endpoint.
 */
export async function generateEpubLegacy(requestBody) {
  try {
    const resp = await fetch(`${config.scraperUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (!resp.ok) throw new Error(`Scraper returned ${resp.status}`);
    return await resp.json();
  } catch (err) {
    logger.error({ err }, "Legacy EPUB generation failed");
    throw err;
  }
}

// ─── Artifact Status ────────────────────────────────────────────────

/**
 * Get download/artifact status for a novel.
 */
export async function getArtifactStatus(slug) {
  const novel = await Novel.findOne({ slug }).lean();
  if (!novel) throw new NotFoundError("Novel");

  return {
    downloadStatus: novel.downloadStatus,
    downloadUrl: novel.downloadUrl,
    cachedChapters: novel.cachedChaptersCount,
    totalChapters: novel.totalChapters,
    cacheProgress:
      novel.totalChapters > 0
        ? Math.round((novel.cachedChaptersCount / novel.totalChapters) * 100)
        : 0,
  };
}

// ─── Popular Novels ──────────────────────────────────────────────────

/**
 * Get popular novels sorted by engagement score.
 */
export async function getPopularNovels(limit = 20) {
  return Novel.find({ popularityScore: { $gt: 0 } })
    .sort({ popularityScore: -1 })
    .limit(limit)
    .lean();
}
