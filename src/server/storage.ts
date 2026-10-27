import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET ?? "";

export const storageEnabled = Boolean(bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);

function makeClient(endpoint: string | undefined) {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: endpoint || undefined,
    // R2/MinIO: no default CRC32 checksums – browsers can't compute them for presigned uploads
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

let internal: S3Client | undefined;
let publicClient: S3Client | undefined;

/** Talks to S3 from the server (may be a Docker-internal hostname). */
function internalClient() {
  return (internal ??= makeClient(process.env.S3_ENDPOINT));
}

/** S3 API endpoint the browser can reach. A public read-only bucket URL (r2.dev) can't take signed requests. */
function browserEndpoint() {
  const configured = process.env.S3_PUBLIC_ENDPOINT;
  if (configured && /\.r2\.dev$/i.test(new URL(configured).hostname)) {
    console.warn("[storage] S3_PUBLIC_ENDPOINT points to an r2.dev public URL, which doesn't accept signed uploads – using S3_ENDPOINT instead.");
    return process.env.S3_ENDPOINT;
  }
  return configured || process.env.S3_ENDPOINT;
}

/** Signs URLs the browser can reach. */
function browserClient() {
  return (publicClient ??= makeClient(browserEndpoint()));
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Presigned PUT (works on R2, MinIO and AWS – R2 has no presigned POST). The exact
 * Content-Length is part of the signature, so the upload can't exceed what was approved.
 */
export async function presignUpload(key: string, contentType: string, contentLength: number) {
  return getSignedUrl(
    browserClient(),
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength }),
    { expiresIn: 300, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

const urlCache = new Map<string, { url: string; expires: number }>();

/** Optional public base URL for reads (e.g. an R2 r2.dev or custom domain). Unset = private bucket + signed URLs. */
const publicReadUrl = process.env.S3_PUBLIC_URL?.replace(/\/+$/, "") || null;

/**
 * URL for showing an object: `${S3_PUBLIC_URL}/${key}` when configured, otherwise a
 * short-lived signed GET URL (cached in memory so pages stay cache-friendly).
 */
export async function photoUrl(key: string | null | undefined): Promise<string | null> {
  if (!key || !storageEnabled) return null;
  if (publicReadUrl) return `${publicReadUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const now = Date.now();
  const hit = urlCache.get(key);
  if (hit && hit.expires > now + 5 * 60_000) return hit.url;
  const url = await getSignedUrl(browserClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
  urlCache.set(key, { url, expires: now + 3600_000 });
  if (urlCache.size > 2000) urlCache.clear();
  return url;
}

export async function deleteObject(key: string) {
  if (!storageEnabled) return;
  urlCache.delete(key);
  await internalClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
