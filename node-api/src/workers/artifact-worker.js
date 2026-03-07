/**
 * NovelGrab – Artifact Builder Worker (Node.js)
 *
 * BullMQ worker that builds EPUB artifacts for instant downloads.
 *
 * Trigger conditions (any):
 *   - User reads ≥ N chapters
 *   - User clicks download
 *   - User bookmarks
 *   - Manual admin trigger
 *
 * Flow:
 *   1. Job received
 *   2. Check if artifact already exists
 *   3. Ensure all chapters cached
 *   4. Fetch chapter content from Python scraper (for uncached)
 *   5. Assemble EPUB via Python backend
 *   6. Upload to object storage
 *   7. Mark downloadStatus = ready
 *
 * Pattern from bullmq-specialist skill:
 *   - Worker with concurrency control
 *   - Job progress reporting
 *   - Graceful shutdown
 */

import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { connectDB } from "../config/database.js";
import { QUEUE_NAMES } from "../services/queue.js";
import {
  uploadObject,
  objectExists,
  artifactStorageKey,
  getObjectUrl,
  downloadObject,
  chapterStorageKey,
} from "../services/storage.js";
import Novel from "../models/Novel.js";
import Chapter from "../models/Chapter.js";
import config from "../config/index.js";
import { logger } from "../utils/logger.js";

// ─── Worker Process ────────────────────────────────────────────────

async function processArtifactJob(job) {
  const { novelSlug, title, author, coverUrl } = job.data;

  logger.info({ jobId: job.id, novelSlug }, "Starting artifact build");

  try {
    // 1. Check if artifact already exists
    const storageKey = artifactStorageKey(novelSlug);
    if (await objectExists(storageKey)) {
      logger.info({ novelSlug }, "Artifact already exists, updating DB");

      const url = await getObjectUrl(storageKey);
      await Novel.updateOne(
        { slug: novelSlug },
        {
          $set: {
            downloadStatus: "ready",
            downloadUrl: url,
            artifactPath: storageKey,
          },
        },
      );

      await job.updateProgress(100);
      return { status: "ready", url };
    }

    // 2. Get all chapters for this novel
    const chapters = await Chapter.find({ novelSlug })
      .sort({ chapterNumber: 1 })
      .lean();

    if (chapters.length === 0) {
      throw new Error("No chapters found for this novel");
    }

    const totalChapters = chapters.length;
    await job.updateProgress(5);

    // 3. Ensure all chapters are cached, fetch missing ones
    const chaptersContent = [];

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      let content = null;

      // Try to get from object storage first
      const chKey = chapterStorageKey(novelSlug, ch.chapterNumber);
      const cached = await downloadObject(chKey);

      if (cached) {
        const parsed = JSON.parse(cached.toString());
        content = parsed.html;
      } else {
        // Fetch from Python scraper
        try {
          const resp = await fetch(
            `${config.scraperUrl}/api/chapter-content?url=${encodeURIComponent(ch.sourceUrl)}`,
          );
          if (resp.ok) {
            const data = await resp.json();
            content = data.content;

            // Cache it while we're at it
            const cacheData = JSON.stringify({
              html: content,
              title: ch.title,
              fetchedAt: new Date().toISOString(),
            });
            await uploadObject(chKey, cacheData, "application/json");

            // Update chapter cache status
            await Chapter.updateOne(
              { _id: ch._id },
              {
                $set: {
                  isCached: true,
                  storagePath: chKey,
                  storageUrl: await getObjectUrl(chKey),
                  fetchedAt: new Date(),
                },
              },
            );
          }
        } catch (err) {
          logger.warn(
            { err, chapterNumber: ch.chapterNumber },
            "Failed to fetch chapter for artifact",
          );
        }
      }

      chaptersContent.push({
        title: ch.title || `Chapter ${ch.chapterNumber}`,
        content: content || "<p>Chapter content could not be loaded.</p>",
      });

      // Update progress
      const progress = Math.round(5 + (i / totalChapters) * 70);
      await job.updateProgress(progress);
    }

    // 4. Build EPUB via Python backend
    await job.updateProgress(80);
    logger.info({ novelSlug }, "Building EPUB via Python backend");

    const generateResp = await fetch(`${config.scraperUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        novel_title: title,
        author: author || "Unknown Author",
        cover_url: coverUrl || "",
        chapters: chapters.map((ch) => ({
          title: ch.title,
          url: ch.sourceUrl,
        })),
      }),
    });

    if (!generateResp.ok) {
      throw new Error(`EPUB generation failed: ${generateResp.status}`);
    }

    const { job_id: pyJobId } = await generateResp.json();

    // 5. Wait for Python EPUB generation to complete
    await job.updateProgress(85);
    let epubReady = false;
    let retries = 0;
    const maxRetries = 120; // Wait up to 2 minutes

    while (!epubReady && retries < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000));

      try {
        const progressResp = await fetch(
          `${config.scraperUrl}/api/progress/${pyJobId}`,
        );
        const reader = progressResp.body.getReader();
        const decoder = new TextDecoder();
        let lastData = "";

        // Read SSE chunks
        const { value } = await reader.read();
        if (value) {
          lastData = decoder.decode(value);
        }
        reader.releaseLock();

        if (
          lastData.includes('"status": "complete"') ||
          lastData.includes('"status":"complete"')
        ) {
          epubReady = true;
        } else if (
          lastData.includes('"status": "error"') ||
          lastData.includes('"status":"error"')
        ) {
          throw new Error("Python EPUB generation failed");
        }
      } catch (err) {
        if (err.message === "Python EPUB generation failed") throw err;
      }

      retries++;
    }

    if (!epubReady) {
      throw new Error("EPUB generation timed out");
    }

    // 6. Download the EPUB from Python backend
    await job.updateProgress(90);

    const downloadResp = await fetch(
      `${config.scraperUrl}/api/download/${pyJobId}`,
    );

    if (!downloadResp.ok) {
      throw new Error("Failed to download generated EPUB");
    }

    const epubBuffer = Buffer.from(await downloadResp.arrayBuffer());

    // 7. Upload to object storage
    await job.updateProgress(95);
    await uploadObject(storageKey, epubBuffer, "application/epub+zip");

    const downloadUrl = await getObjectUrl(storageKey);

    // 8. Update novel status
    await Novel.updateOne(
      { slug: novelSlug },
      {
        $set: {
          downloadStatus: "ready",
          downloadUrl,
          artifactPath: storageKey,
        },
      },
    );

    // Update cached chapters count
    const cachedCount = await Chapter.countDocuments({
      novelSlug,
      isCached: true,
    });
    await Novel.updateOne(
      { slug: novelSlug },
      { $set: { cachedChaptersCount: cachedCount } },
    );

    await job.updateProgress(100);
    logger.info({ novelSlug, downloadUrl }, "Artifact build complete ✅");

    return { status: "ready", downloadUrl };
  } catch (err) {
    logger.error({ err, novelSlug }, "Artifact build failed ❌");

    // Mark novel as failed
    await Novel.updateOne(
      { slug: novelSlug },
      { $set: { downloadStatus: "failed" } },
    ).catch(() => {});

    throw err;
  }
}

// ─── Chapter Cache Worker (handles chapter-cache queue from Node side) ─

async function processChapterCacheJob(job) {
  const { novelSlug, chapterNumber, sourceUrl, title } = job.data;

  logger.debug({ novelSlug, chapterNumber }, "Processing chapter cache job");

  try {
    // Check if already cached
    const storageKey = chapterStorageKey(novelSlug, chapterNumber);
    if (await objectExists(storageKey)) {
      logger.debug({ novelSlug, chapterNumber }, "Chapter already cached");
      return { cached: true };
    }

    // Fetch from Python scraper
    const resp = await fetch(
      `${config.scraperUrl}/api/chapter-content?url=${encodeURIComponent(sourceUrl)}`,
    );

    if (!resp.ok) {
      throw new Error(`Scraper returned ${resp.status}`);
    }

    const data = await resp.json();

    // Upload to storage
    const cacheData = JSON.stringify({
      html: data.content,
      title: title,
      fetchedAt: new Date().toISOString(),
    });

    await uploadObject(storageKey, cacheData, "application/json");

    // Update MongoDB
    await Chapter.updateOne(
      { novelSlug, chapterNumber },
      {
        $set: {
          isCached: true,
          storagePath: storageKey,
          storageUrl: await getObjectUrl(storageKey),
          fetchedAt: new Date(),
        },
      },
    );

    // Update novel cached count
    const cachedCount = await Chapter.countDocuments({
      novelSlug,
      isCached: true,
    });
    await Novel.updateOne(
      { slug: novelSlug },
      { $set: { cachedChaptersCount: cachedCount } },
    );

    logger.debug(
      { novelSlug, chapterNumber },
      "Chapter cached successfully ✅",
    );
    return { cached: true };
  } catch (err) {
    logger.error({ err, novelSlug, chapterNumber }, "Chapter cache failed");
    throw err;
  }
}

// ─── Worker Startup ────────────────────────────────────────────────

async function startWorkers() {
  // Connect to MongoDB
  await connectDB();
  logger.info("Artifact worker connected to MongoDB");

  const connection = getRedisConnection();

  // Artifact Builder Worker
  const artifactWorker = new Worker(
    QUEUE_NAMES.BUILD_ARTIFACT,
    processArtifactJob,
    {
      connection,
      concurrency: 1, // One artifact build at a time
      limiter: {
        max: 2,
        duration: 60000, // Max 2 builds per minute
      },
    },
  );

  artifactWorker.on("completed", (job, result) => {
    logger.info({ jobId: job.id, result }, "Artifact job completed");
  });

  artifactWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Artifact job failed");
  });

  // Chapter Cache Worker
  const chapterWorker = new Worker(
    QUEUE_NAMES.CHAPTER_CACHE,
    processChapterCacheJob,
    {
      connection,
      concurrency: 3, // Process 3 chapters at a time
      limiter: {
        max: 10,
        duration: 60000, // Max 10 fetches per minute
      },
    },
  );

  chapterWorker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Chapter cache job completed");
  });

  chapterWorker.on("failed", (job, err) => {
    logger.warn(
      { jobId: job?.id, err: err.message },
      "Chapter cache job failed",
    );
  });

  logger.info("🚀 Workers started: artifact-builder + chapter-cache");

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info({ signal }, "Shutting down workers...");
    await Promise.all([artifactWorker.close(), chapterWorker.close()]);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startWorkers().catch((err) => {
  logger.error({ err }, "Worker startup failed");
  process.exit(1);
});
