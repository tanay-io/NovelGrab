/**
 * NovelGrab – Redis Connection (for BullMQ)
 *
 * Pattern from bullmq-specialist skill:
 *  - Shared IORedis connection
 *  - maxRetriesPerRequest: null (required by BullMQ)
 *  - Event-based health monitoring
 */

import IORedis from "ioredis";
import config from "./index.js";
import { logger } from "../utils/logger.js";

let redisConnection = null;

export function getRedisConnection() {
  if (redisConnection) return redisConnection;

  redisConnection = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null, // BullMQ requirement
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      logger.warn(`Redis retry attempt ${times}, delay ${delay}ms`);
      return delay;
    },
  });

  redisConnection.on("connect", () => {
    logger.info("Redis connected");
  });

  redisConnection.on("error", (err) => {
    logger.error({ err }, "Redis connection error");
  });

  redisConnection.on("close", () => {
    logger.warn("Redis connection closed");
  });

  return redisConnection;
}

export async function disconnectRedis() {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    logger.info("Redis disconnected gracefully");
  }
}
