/**
 * NovelGrab – API Routes
 *
 * Centralized route definitions.
 * Following nodejs-backend-patterns skill: route → controller → service.
 */

import { Router } from "express";
import * as novelController from "../controllers/novelController.js";
import * as proxyController from "../controllers/proxyController.js";
import * as storageController from "../controllers/storageController.js";

const router = Router();

// ─── Novel Endpoints (NEW — cache-first with BullMQ) ───────────────

// Search novels
router.get("/search", novelController.search);

// Get novel info + chapter list
router.get("/chapters", novelController.getChapters);

// Read chapter (cache-first with prefetch) — NEW
router.get("/read/:slug/:chapterNumber", novelController.readChapter);

// Trigger artifact download — NEW
router.post("/download/:slug", novelController.triggerDownload);

// Get artifact/download status — NEW
router.get("/artifact-status/:slug", novelController.getArtifactStatus);

// Get popular novels — NEW
router.get("/popular", novelController.getPopularNovels);

// ─── Backwards-Compatible Proxy Endpoints ─────────────────────────

// Fetch chapter content by URL (proxy to Python)
router.get("/chapter-content", novelController.getChapterContentByUrl);

// Generate EPUB (proxy to Python)
router.post("/generate", novelController.generateEpub);

// SSE progress stream (proxy to Python)
router.get("/progress/:jobId", proxyController.proxyProgress);

// Download generated EPUB (proxy to Python)
router.get("/download/:jobId", proxyController.proxyDownload);

// Dictionary lookup (proxy to Python)
router.get("/dictionary/:word", proxyController.proxyDictionary);

// Cache management (proxy to Python)
router.get("/cache-stats", proxyController.proxyCacheStats);
router.delete("/cache", proxyController.proxyCacheClear);

// ─── Local Storage Endpoint ────────────────────────────────────────

router.get("/storage/*", storageController.serveStorageFile);

export default router;
