/**
 * NovelGrab – Storage Controller
 *
 * Serves files from local object storage (development mode).
 * In production, files are served directly from S3/R2 via CDN.
 */

import fs from "fs/promises";
import path from "path";
import config from "../config/index.js";
import { NotFoundError } from "../utils/errors.js";

/**
 * GET /api/storage/*
 * Serve a file from local storage.
 */
export async function serveStorageFile(req, res, next) {
  try {
    // Only available in local storage mode
    if (config.storage.provider !== "local") {
      return res.status(404).json({
        success: false,
        error: { message: "Local storage not enabled" },
      });
    }

    const key = req.params[0]; // Wildcard match
    const filePath = path.resolve(config.storage.localPath, key);

    // Security: prevent path traversal
    const storageRoot = path.resolve(config.storage.localPath);
    if (!filePath.startsWith(storageRoot)) {
      return res.status(403).json({
        success: false,
        error: { message: "Access denied" },
      });
    }

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundError("File");
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      ".json": "application/json",
      ".epub": "application/epub+zip",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // For EPUB files, set download header
    if (ext === ".epub") {
      const filename = path.basename(filePath);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
    }

    const data = await fs.readFile(filePath);
    res.send(data);
  } catch (err) {
    next(err);
  }
}
