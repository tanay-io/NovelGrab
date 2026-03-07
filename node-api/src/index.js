/**
 * NovelGrab – Node.js API Server (THE BRAIN)
 *
 * Main entry point for the Node.js API server.
 * This is the central orchestrator that:
 *   - Receives all frontend requests
 *   - Manages business logic
 *   - Enqueues BullMQ jobs
 *   - Proxies to Python scraper when needed
 *   - Serves cached content from object storage
 *
 * Architecture:
 *   Frontend → Node.js API → Redis/BullMQ → Python Worker
 *                           → MongoDB
 *                           → Object Storage
 *
 * Pattern from nodejs-backend-patterns skill:
 *   - Express with helmet, cors, compression, morgan
 *   - Layered architecture: routes → controllers → services
 *   - Centralized error handling
 *   - Graceful shutdown
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import config from "./config/index.js";
import { connectDB, disconnectDB } from "./config/database.js";
import { getRedisConnection, disconnectRedis } from "./config/redis.js";
import { closeQueues } from "./services/queue.js";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";

const app = express();

// ─── Security & Parsing Middleware ─────────────────────────────────

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: "*", // Restrict in production
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging (dev: concise, prod: combined)
if (config.isDev) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ─── Health Check ──────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({
    message: "NovelGrab API is running",
    version: "3.0.0",
    architecture: "Node.js Brain + Python Worker + Redis/BullMQ",
    endpoints: {
      search: "GET /api/search?q=...",
      chapters: "GET /api/chapters?url=...",
      read: "GET /api/read/:slug/:chapterNumber",
      chapterContent: "GET /api/chapter-content?url=...",
      generate: "POST /api/generate",
      progress: "GET /api/progress/:jobId",
      download: "GET /api/download/:jobId",
      triggerDownload: "POST /api/download/:slug",
      artifactStatus: "GET /api/artifact-status/:slug",
      popular: "GET /api/popular",
      dictionary: "GET /api/dictionary/:word",
      cacheStats: "GET /api/cache-stats",
    },
  });
});

app.get("/health", async (req, res) => {
  const checks = {
    api: "ok",
    mongodb: "unknown",
    redis: "unknown",
    scraper: "unknown",
  };

  // MongoDB check
  try {
    const mongoose = await import("mongoose");
    checks.mongodb =
      mongoose.default.connection.readyState === 1 ? "ok" : "disconnected";
  } catch {
    checks.mongodb = "error";
  }

  // Redis check
  try {
    const redis = getRedisConnection();
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  // Python scraper check
  try {
    const resp = await fetch(`${config.scraperUrl}/`);
    checks.scraper = resp.ok ? "ok" : "error";
  } catch {
    checks.scraper = "unreachable";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────────────

app.use("/api", routes);

// ─── Error Handling ────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Server Startup ────────────────────────────────────────────────

async function start() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Redis connection
    getRedisConnection();

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(
        {
          port: config.port,
          env: config.nodeEnv,
          scraperUrl: config.scraperUrl,
          storageProvider: config.storage.provider,
        },
        `🚀 NovelGrab API started on port ${config.port}`,
      );
    });

    // ─── Graceful Shutdown ──────────────────────────────────────────

    const gracefulShutdown = async (signal) => {
      logger.info({ signal }, "Graceful shutdown initiated...");

      server.close(async () => {
        logger.info("HTTP server closed");

        await Promise.all([closeQueues(), disconnectRedis(), disconnectDB()]);

        logger.info("All connections closed. Goodbye!");
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      logger.error({ reason }, "Unhandled rejection");
    });

    process.on("uncaughtException", (err) => {
      logger.error({ err }, "Uncaught exception — shutting down");
      process.exit(1);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

start();

export default app;
