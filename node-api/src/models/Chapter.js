/**
 * NovelGrab – Chapter Model (MongoDB/Mongoose)
 *
 * Tracks individual chapter cache status and storage location.
 * Compound index on (novelSlug, chapterNumber) for fast lookups.
 */

import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema(
  {
    // Reference to parent novel
    novelSlug: {
      type: String,
      required: true,
      index: true,
    },

    // Chapter ordering
    chapterNumber: {
      type: Number,
      required: true,
    },

    // Original chapter title
    title: {
      type: String,
      default: "",
    },

    // Source URL for scraping
    sourceUrl: {
      type: String,
      required: true,
    },

    // Cache status
    isCached: {
      type: Boolean,
      default: false,
    },

    // Object storage path (e.g., /novels/{slug}/chapters/0001.json)
    storagePath: {
      type: String,
      default: "",
    },

    // Full URL to cached content (resolved via CDN or storage)
    storageUrl: {
      type: String,
      default: "",
    },

    // When was this chapter fetched
    fetchedAt: {
      type: Date,
      default: null,
    },

    // Content hash for deduplication
    contentHash: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for fast chapter lookups
chapterSchema.index({ novelSlug: 1, chapterNumber: 1 }, { unique: true });
// For finding uncached chapters
chapterSchema.index({ novelSlug: 1, isCached: 1 });

const Chapter = mongoose.model("Chapter", chapterSchema);

export default Chapter;
