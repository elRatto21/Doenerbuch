"use server";

import { z } from "zod";
import { requireUser } from "@/lib/session";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, presignUpload, storageEnabled } from "@/server/storage";

const inputSchema = z.object({
  kind: z.enum(["entry", "avatar"]),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().min(1).max(MAX_UPLOAD_BYTES, "Foto ist zu groß (max. 8 MB)."),
});

export async function createUpload(input: z.infer<typeof inputSchema>) {
  const current = await requireUser();
  if (!storageEnabled) throw new Error("Foto-Upload ist nicht konfiguriert.");
  const { kind, contentType, size } = inputSchema.parse(input);
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `${kind === "avatar" ? "avatars" : "entries"}/${current.id}/${crypto.randomUUID()}.${ext}`;
  const url = await presignUpload(key, contentType, size);
  return { key, url };
}
