"use server";

import { z } from "zod";
import { requireUser } from "@/lib/session";
import { ALLOWED_IMAGE_TYPES, presignUpload, storageEnabled } from "@/server/storage";

const inputSchema = z.object({
  kind: z.enum(["entry", "avatar"]),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
});

export async function createUpload(input: z.infer<typeof inputSchema>) {
  const current = await requireUser();
  if (!storageEnabled) throw new Error("Foto-Upload ist nicht konfiguriert.");
  const { kind, contentType } = inputSchema.parse(input);
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `${kind === "avatar" ? "avatars" : "entries"}/${current.id}/${crypto.randomUUID()}.${ext}`;
  const { url, fields } = await presignUpload(key, contentType);
  return { key, url, fields };
}
