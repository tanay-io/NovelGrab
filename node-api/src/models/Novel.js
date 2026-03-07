/**
 * NovelGrab – Novel Model (MongoDB/Mongoose)
 *
 * Stores novel metadata, cache status, download readiness.
 * Schema follows the architecture spec:
 *   - totalChapters, cachedChaptersCount for progress tracking
 *   - downloadStatus for artifact pipeline state
 *   - popularityScore for engagement-based sorting
 *
 * Indexes: slug (unique), title (text search), popularityScore (desc)
 */

import mongoose from "mongoose";

const novelSchema = new mongoose.Schema(
  {
    // Unique slug derived from source URL (e.g., "martial-peak")
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Novel metadata
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      default: "Unknown Author",
    },
    coverUrl: {
      type: String,
      default: "",
    },
    genres: {
      type: [String],
      default: [],
    },
    rating: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    sourceUrl: {
      type: String,
      required: true,
    },

    // Chapter tracking
    totalChapters: {
      type: Number,
      default: 0,
    },
    cachedChaptersCount: {
      type: Number,
      default: 0,
    },

    // Download/artifact status: none | preparing | ready | failed
    downloadStatus: {
      type: String,
      enum: ["none", "preparing", "ready", "failed"],
      default: "none",
    },
    downloadUrl: {
      type: String,
      default: "",
    },
    artifactPath: {
      type: String,
      default: "",
    },

    // Engagement
    lastReadAt: {
      type: Date,
      default: null,
    },
    readCount: {
      type: Number,
      default: 0,
    },
    popularityScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// Text search index on title
novelSchema.index({ title: "text" });
// For popularity-based queries
novelSchema.index({ popularityScore: -1 });

const Novel = mongoose.model("Novel", novelSchema);

export default Novel;
