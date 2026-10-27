import { createUpload } from "@/server/actions/upload";

/** Downscale to max `maxSize` px and re-encode as JPEG to keep uploads small. */
export async function resizeImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", quality));
}

/** Resizes, asks the server for a presigned PUT and uploads directly to S3/R2/MinIO. Returns the object key. */
export async function uploadImage(file: File, kind: "entry" | "avatar"): Promise<string> {
  const blob = await resizeImage(file, kind === "avatar" ? 512 : 1600);
  const contentType = blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "image/jpeg";
  const { key, url } = await createUpload({ kind, contentType, size: blob.size });
  const response = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": contentType } });
  if (!response.ok) throw new Error(`Upload fehlgeschlagen (${response.status})`);
  return key;
}
