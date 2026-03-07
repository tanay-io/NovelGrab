/**
 * NovelGrab – Database Connection (MongoDB via Mongoose)
 *
 * Pattern from nodejs-backend-patterns skill:
 *  - Connection pooling (maxPoolSize)
 *  - Graceful shutdown
 *  - Event-based logging
 *  - Selection timeout for fast failure
 */

import mongoose from "mongoose";
import config from "./index.js";
import { logger } from "../utils/logger.js";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info("MongoDB connected successfully");

    mongoose.connection.on("error", (err) => {
      logger.error({ err }, "MongoDB connection error");
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      isConnected = false;
    });
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
    process.exit(1);
  }
}

export async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info("MongoDB disconnected gracefully");
}
