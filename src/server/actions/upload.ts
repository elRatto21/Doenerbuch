"use server";

import { z } from "zod";
import { requireUser } from "@/lib/session";
import { rateLimit, RateLimitError } from "@/server/rate-limit";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, presignUpload, storageEnabled, thumbKey } from "@/server/storage";

const inputSchema = z.object({
  kind: z.enum(["entry", "avatar"]),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().min(1).max(MAX_UPLOAD_BYTES, "Foto ist zu groß (max. 8 MB)."),
  /** JPEG thumbnail for entry photos (shown in the journal). */
  thumbSize: z.number().int().min(1).max(512 * 1024).optional(),
});

export type UploadTicket = { ok: true; key: string; url: string; thumbUrl: string | null } | { ok: false; error: string };

export async function createUpload(input: z.infer<typeof inputSchema>): Promise<UploadTicket> {
  const current = await requireUser();
  if (!storageEnabled) return { ok: false, error: "Foto-Upload ist nicht konfiguriert." };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültiges Foto." };
  try {
    rateLimit("upload", current.id);
  } catch (err) {
    if (err instanceof RateLimitError) return { ok: false, error: err.message };
    throw err;
  }
  const { kind, contentType, size, thumbSize } = parsed.data;
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `${kind === "avatar" ? "avatars" : "entries"}/${current.id}/${crypto.randomUUID()}.${ext}`;
  const url = await presignUpload(key, contentType, size);
  const thumbUrl = kind === "entry" && thumbSize ? await presignUpload(thumbKey(key), "image/jpeg", thumbSize) : null;
  return { ok: true, key, url, thumbUrl };
}
