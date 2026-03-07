/**
 * NovelGrab – Object Storage Service
 *
 * Abstraction layer over S3-compatible storage (AWS S3, Cloudflare R2, MinIO)
 * with local filesystem fallback for development.
 *
 * Deterministic paths:
 *   /novels/{slug}/chapters/{chapterNumber}.json
 *   /novels/{slug}/artifact/book.epub
 *   /covers/{slug}.jpg
 *
 * Pattern from file-uploads skill:
 *   - S3 client with presigned URLs
 *   - Local fallback for dev
 *   - Content-type detection
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config/index.js";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── S3 client (lazy-loaded) ──────────────────────────────────────

let s3Client = null;

async function getS3Client() {
  if (s3Client) return s3Client;

  const { S3Client } = await import("@aws-sdk/client-s3");
  s3Client = new S3Client({
    region: config.storage.s3.region,
    endpoint: config.storage.s3.endpoint || undefined,
    credentials: {
      accessKeyId: config.storage.s3.accessKeyId,
      secretAccessKey: config.storage.s3.secretAccessKey,
    },
    forcePathStyle: true, // Required for MinIO/R2
  });

  return s3Client;
}

// ─── Local Storage Helpers ─────────────────────────────────────────

function localStoragePath(key) {
  return path.resolve(config.storage.localPath, key);
}

async function ensureLocalDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Upload content to object storage.
 * @param {string} key – Storage key (e.g., "novels/slug/chapters/0001.json")
 * @param {Buffer|string} content – File content
 * @param {string} contentType – MIME type
 * @returns {string} Public URL or local path
 */
export async function uploadObject(
  key,
  content,
  contentType = "application/json",
) {
  if (config.storage.provider === "s3") {
    return uploadToS3(key, content, contentType);
  }
  return uploadToLocal(key, content);
}

/**
 * Download content from object storage.
 * @param {string} key – Storage key
 * @returns {Buffer|null} Content or null if not found
 */
export async function downloadObject(key) {
  if (config.storage.provider === "s3") {
    return downloadFromS3(key);
  }
  return downloadFromLocal(key);
}

/**
 * Check if an object exists.
 * @param {string} key – Storage key
 * @returns {boolean}
 */
export async function objectExists(key) {
  if (config.storage.provider === "s3") {
    return existsInS3(key);
  }
  return existsInLocal(key);
}

/**
 * Delete an object.
 * @param {string} key – Storage key
 */
export async function deleteObject(key) {
  if (config.storage.provider === "s3") {
    return deleteFromS3(key);
  }
  return deleteFromLocal(key);
}

/**
 * Get a public/download URL for an object.
 * For S3: generates a presigned URL (1 hour).
 * For local: returns the API serve path.
 */
export async function getObjectUrl(key) {
  if (config.storage.provider === "s3") {
    return getS3PresignedUrl(key);
  }
  // Local: serve via API endpoint
  return `/api/storage/${key}`;
}

// ─── Deterministic Path Builders ───────────────────────────────────

export function chapterStorageKey(slug, chapterNumber) {
  const num = String(chapterNumber).padStart(4, "0");
  return `novels/${slug}/chapters/${num}.json`;
}

export function artifactStorageKey(slug) {
  return `novels/${slug}/artifact/book.epub`;
}

export function coverStorageKey(slug) {
  return `covers/${slug}.jpg`;
}

// ─── S3 Implementation ────────────────────────────────────────────

async function uploadToS3(key, content, contentType) {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  const body = typeof content === "string" ? Buffer.from(content) : content;

  await client.send(
    new PutObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  logger.debug({ key }, "Uploaded to S3");

  if (config.cdnBaseUrl) {
    return `${config.cdnBaseUrl}/${key}`;
  }
  return `${config.storage.s3.endpoint}/${config.storage.s3.bucket}/${key}`;
}

async function downloadFromS3(key) {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  try {
    const resp = await client.send(
      new GetObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: key,
      }),
    );
    const chunks = [];
    for await (const chunk of resp.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

async function existsInS3(key) {
  const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

async function deleteFromS3(key) {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: key,
    }),
  );
}

async function getS3PresignedUrl(key) {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await getS3Client();

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: key,
    }),
    { expiresIn: 3600 }, // 1 hour
  );

  return url;
}

// ─── Local Implementation ──────────────────────────────────────────

async function uploadToLocal(key, content) {
  const filePath = localStoragePath(key);
  await ensureLocalDir(filePath);

  const data = typeof content === "string" ? content : content;
  await fs.writeFile(filePath, data);

  logger.debug({ key, filePath }, "Uploaded to local storage");
  return `/api/storage/${key}`;
}

async function downloadFromLocal(key) {
  const filePath = localStoragePath(key);
  try {
    return await fs.readFile(filePath);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function existsInLocal(key) {
  const filePath = localStoragePath(key);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function deleteFromLocal(key) {
  const filePath = localStoragePath(key);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}
