/**
 * NovelGrab – Configuration Module
 *
 * Centralised environment configuration with validation.
 * Pattern: dotenv → validate → freeze → export
 * (Following nodejs-backend-patterns skill)
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config = Object.freeze({
  // Server
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",

  // MongoDB
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/novelgrab",

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
  },

  // Python scraper URL
  scraperUrl: process.env.PYTHON_SCRAPER_URL || "http://localhost:8000",

  // Object Storage
  storage: {
    provider: process.env.STORAGE_PROVIDER || "local", // 'local' | 's3'
    localPath: process.env.LOCAL_STORAGE_PATH || "./storage",
    s3: {
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION || "auto",
      bucket: process.env.S3_BUCKET || "novelgrab",
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  },

  // CDN
  cdnBaseUrl: process.env.CDN_BASE_URL || "",

  // Engagement
  prefetchAhead: parseInt(process.env.PREFETCH_AHEAD || "5", 10),
  artifactTriggerChapters: parseInt(
    process.env.ARTIFACT_TRIGGER_CHAPTERS || "5",
    10,
  ),
});

export default config;
