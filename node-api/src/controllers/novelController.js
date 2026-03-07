/**
 * NovelGrab – Novel Controller
 *
 * HTTP request handlers (thin layer).
 * Pattern: validate input → call service → format response.
 * Following nodejs-backend-patterns skill: Controllers → Services → Repositories.
 */

import * as novelService from "../services/novel.js";
import { ValidationError } from "../utils/errors.js";

/**
 * GET /api/search?q=...
 */
export async function search(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      throw new ValidationError("Search query 'q' is required");
    }
    const data = await novelService.searchNovels(q.trim());
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chapters?url=...
 */
export async function getChapters(req, res, next) {
  try {
    const { url } = req.query;
    if (!url) {
      throw new ValidationError("Novel URL is required");
    }
    const data = await novelService.getNovelInfo(url);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chapter-content?url=...
 * (Backwards-compatible: proxy to Python scraper)
 */
export async function getChapterContentByUrl(req, res, next) {
  try {
    const { url } = req.query;
    if (!url) {
      throw new ValidationError("Chapter URL is required");
    }
    const data = await novelService.readChapterByUrl(url);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/read/:slug/:chapterNumber
 * NEW – Cache-first chapter reading with prefetch.
 */
export async function readChapter(req, res, next) {
  try {
    const { slug, chapterNumber } = req.params;
    const num = parseInt(chapterNumber, 10);
    if (isNaN(num) || num < 1) {
      throw new ValidationError("Valid chapter number is required");
    }
    const data = await novelService.readChapter(slug, num);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/generate
 * (Backwards-compatible: proxy to Python scraper for EPUB generation)
 */
export async function generateEpub(req, res, next) {
  try {
    const data = await novelService.generateEpubLegacy(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/download/:slug
 * NEW – Trigger artifact build or return existing download URL.
 */
export async function triggerDownload(req, res, next) {
  try {
    const { slug } = req.params;
    if (!slug) {
      throw new ValidationError("Novel slug is required");
    }
    const data = await novelService.triggerArtifactBuild(slug);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/artifact-status/:slug
 * Check download/artifact status.
 */
export async function getArtifactStatus(req, res, next) {
  try {
    const { slug } = req.params;
    const data = await novelService.getArtifactStatus(slug);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/popular
 * Get popular novels by engagement score.
 */
export async function getPopularNovels(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || "20", 10);
    const novels = await novelService.getPopularNovels(limit);
    res.json({ success: true, novels, total: novels.length });
  } catch (err) {
    next(err);
  }
}
