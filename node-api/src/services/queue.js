/**
 * NovelGrab – BullMQ Queue Definitions
 *
 * Two queues as specified in the architecture:
 *
 * Queue 1: chapter-cache
 *   - Purpose: Fetch missing chapters, progressive prefetch
 *   - Producer: Node API
 *   - Consumer: Python worker (via bridge)
 *
 * Queue 2: build-artifact
 *   - Purpose: Build full EPUB, prepare instant download
 *   - Producer: Node API
 *   - Consumer: Node.js artifact worker
 *
 * Pattern from bullmq-specialist skill:
 *   - Shared Redis connection
 *   - Default job options (attempts, backoff, removeOnComplete)
 *   - Queue events for monitoring
 */

import { Queue, QueueEvents } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { logger } from "../utils/logger.js";

// ─── Queue Names ───────────────────────────────────────────────────

export const QUEUE_NAMES = {
  CHAPTER_CACHE: "chapter-cache",
  BUILD_ARTIFACT: "build-artifact",
};

// ─── Queue Instances (lazy) ────────────────────────────────────────

let chapterCacheQueue = null;
let buildArtifactQueue = null;
let chapterCacheEvents = null;
let buildArtifactEvents = null;

/**
 * Get the chapter-cache queue (creates if needed).
 */
export function getChapterCacheQueue() {
  if (chapterCacheQueue) return chapterCacheQueue;

  chapterCacheQueue = new Queue(QUEUE_NAMES.CHAPTER_CACHE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000,
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    },
  });

  logger.info("Chapter-cache queue initialised");
  return chapterCacheQueue;
}

/**
 * Get the build-artifact queue (creates if needed).
 */
export function getBuildArtifactQueue() {
  if (buildArtifactQueue) return buildArtifactQueue;

  buildArtifactQueue = new Queue(QUEUE_NAMES.BUILD_ARTIFACT, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        age: 7200, // 2 hours
        count: 100,
      },
      removeOnFail: {
        age: 86400,
      },
    },
  });

  logger.info("Build-artifact queue initialised");
  return buildArtifactQueue;
}

/**
 * Get queue events for chapter-cache (for progress monitoring).
 */
export function getChapterCacheEvents() {
  if (chapterCacheEvents) return chapterCacheEvents;

  chapterCacheEvents = new QueueEvents(QUEUE_NAMES.CHAPTER_CACHE, {
    connection: getRedisConnection(),
  });

  chapterCacheEvents.on("completed", ({ jobId }) => {
    logger.debug({ jobId }, "Chapter cache job completed");
  });

  chapterCacheEvents.on("failed", ({ jobId, failedReason }) => {
    logger.warn({ jobId, failedReason }, "Chapter cache job failed");
  });

  return chapterCacheEvents;
}

/**
 * Get queue events for build-artifact.
 */
export function getBuildArtifactEvents() {
  if (buildArtifactEvents) return buildArtifactEvents;

  buildArtifactEvents = new QueueEvents(QUEUE_NAMES.BUILD_ARTIFACT, {
    connection: getRedisConnection(),
  });

  buildArtifactEvents.on("completed", ({ jobId }) => {
    logger.info({ jobId }, "Artifact build job completed");
  });

  buildArtifactEvents.on("failed", ({ jobId, failedReason }) => {
    logger.error({ jobId, failedReason }, "Artifact build job failed");
  });

  return buildArtifactEvents;
}

/**
 * Close all queues gracefully.
 */
export async function closeQueues() {
  const closeOps = [];
  if (chapterCacheQueue) closeOps.push(chapterCacheQueue.close());
  if (buildArtifactQueue) closeOps.push(buildArtifactQueue.close());
  if (chapterCacheEvents) closeOps.push(chapterCacheEvents.close());
  if (buildArtifactEvents) closeOps.push(buildArtifactEvents.close());
  await Promise.all(closeOps);
  logger.info("All queues closed");
}
