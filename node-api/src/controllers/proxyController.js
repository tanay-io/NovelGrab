/**
 * NovelGrab – Proxy Controller
 *
 * Proxies certain requests directly to the Python FastAPI backend
 * for backwards compatibility. The Node API acts as the single
 * entry point for the frontend.
 */

import config from "../config/index.js";
import { ServiceUnavailableError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

/**
 * GET /api/progress/:jobId
 * Proxy SSE progress stream from Python backend.
 */
export async function proxyProgress(req, res, next) {
  try {
    const { jobId } = req.params;
    const url = `${config.scraperUrl}/api/progress/${jobId}`;

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Fetch SSE stream from Python backend
    const response = await fetch(url);
    if (!response.ok) {
      res.write(
        `data: ${JSON.stringify({ status: "error", error: "Job not found" })}\n\n`,
      );
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } catch (err) {
      logger.warn({ err }, "SSE stream interrupted");
    } finally {
      res.end();
    }
  } catch (err) {
    // If headers haven't been sent, use normal error handling
    if (!res.headersSent) {
      next(new ServiceUnavailableError("Progress service"));
    }
  }
}

/**
 * GET /api/download/:jobId
 * Proxy EPUB download from Python backend.
 */
export async function proxyDownload(req, res, next) {
  try {
    const { jobId } = req.params;
    const url = `${config.scraperUrl}/api/download/${jobId}`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: { message: "Download not ready or not found" },
      });
    }

    // Forward headers
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition) {
      res.setHeader("Content-Disposition", contentDisposition);
    }
    res.setHeader("Content-Type", "application/epub+zip");

    // Stream the response
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      res.end();
    }
  } catch (err) {
    if (!res.headersSent) {
      next(new ServiceUnavailableError("Download service"));
    }
  }
}

/**
 * GET /api/dictionary/:word
 * Proxy dictionary lookup.
 */
export async function proxyDictionary(req, res, next) {
  try {
    const { word } = req.params;
    const url = `${config.scraperUrl}/api/dictionary/${encodeURIComponent(word)}`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: { message: "Word not found" },
      });
    }

    const data = await response.json();
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/cache-stats
 * Proxy cache stats from Python backend.
 */
export async function proxyCacheStats(req, res, next) {
  try {
    const url = `${config.scraperUrl}/api/cache-stats`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cache
 * Proxy cache clear to Python backend.
 */
export async function proxyCacheClear(req, res, next) {
  try {
    const url = `${config.scraperUrl}/api/cache`;
    const response = await fetch(url, { method: "DELETE" });
    const data = await response.json();
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}
