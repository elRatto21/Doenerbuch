"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { entryInputSchema, ratingInputSchema, type EntryInput, type RatingInput } from "@/lib/validation";
import { createEntry, deleteEntry, EntryError, rateEntry, updateEntry } from "@/server/queries/entries";
import { PlaceError, suggestPlaces, type PlaceSuggestion } from "@/server/queries/places";
import { deletePhoto } from "@/server/storage";

const suggestSchema = z.object({
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  q: z.string().max(100).nullable(),
});

export async function suggestPlacesAction(input: z.infer<typeof suggestSchema>): Promise<PlaceSuggestion[]> {
  const me = await requireUser();
  const parsed = suggestSchema.parse(input);
  return suggestPlaces(me.id, parsed);
}

export type SaveResult = { ok: true; id: number; badges: string[] } | { ok: false; error: string };

export async function saveEntryAction(input: EntryInput, editId: number | null): Promise<SaveResult> {
  const me = await requireUser();
  const parsed = entryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  try {
    if (editId) {
      const result = await updateEntry(me.id, editId, parsed.data);
      if (result.oldPhotoKey) await deletePhoto(result.oldPhotoKey).catch(() => undefined);
      revalidatePath("/", "layout");
      return { ok: true, id: result.id, badges: result.newBadges };
    }
    const result = await createEntry(me.id, parsed.data);
    revalidatePath("/", "layout");
    return { ok: true, id: result.id, badges: result.newBadges };
  } catch (err) {
    if (err instanceof EntryError || err instanceof PlaceError) return { ok: false, error: err.message };
    console.error("saveEntry failed", err);
    return { ok: false, error: "Speichern fehlgeschlagen. Bitte nochmal versuchen." };
  }
}

export async function rateEntryAction(entryId: number, input: RatingInput): Promise<SaveResult> {
  const me = await requireUser();
  const parsed = ratingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Gib eine Gesamtbewertung von 1–5 Sternen." };
  try {
    const result = await rateEntry(me.id, z.number().int().positive().parse(entryId), parsed.data);
    revalidatePath("/", "layout");
    return { ok: true, id: result.id, badges: result.newBadges };
  } catch (err) {
    if (err instanceof EntryError) return { ok: false, error: err.message };
    console.error("rateEntry failed", err);
    return { ok: false, error: "Speichern fehlgeschlagen. Bitte nochmal versuchen." };
  }
}

export async function deleteEntryAction(entryId: number) {
  const me = await requireUser();
  const removed = await deleteEntry(me.id, z.number().int().parse(entryId));
  if (removed?.photoKey) await deletePhoto(removed.photoKey).catch(() => undefined);
  revalidatePath("/", "layout");
  redirect("/");
}
