import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET ?? "";

export const storageEnabled = Boolean(bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);

function makeClient(endpoint: string | undefined) {
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: endpoint || undefined,
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

/** Signs URLs the browser can reach. */
function browserClient() {
  return (publicClient ??= makeClient(process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT));
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function presignUpload(key: string, contentType: string) {
  return createPresignedPost(browserClient(), {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 1, MAX_UPLOAD_BYTES],
      ["eq", "$Content-Type", contentType],
    ],
    Fields: { "Content-Type": contentType },
    Expires: 300,
  });
}

const urlCache = new Map<string, { url: string; expires: number }>();

/** Short-lived GET URL for a private object. Cached in memory so pages stay cache-friendly. */
export async function photoUrl(key: string | null | undefined): Promise<string | null> {
  if (!key || !storageEnabled) return null;
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
