"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RatingKey } from "@/lib/validation";

export type DraftRatings = Record<RatingKey, number | null>;

export const EMPTY_RATINGS: DraftRatings = { rMeat: null, rBread: null, rSauce: null, rSalad: null, rPortion: null, rValue: null };

export type EntryDraft = {
  /** Identifies what the draft was started from: "new", "von:12", "edit:12", "ort:5". */
  key: string;
  startedAt: number;
  editId: number | null;
  date: string; // yyyy-MM-dd (device local)
  time: string; // HH:mm
  typeId: number | null;
  meat: "kalb" | "haehnchen" | "gemischt" | "veggie";
  placeId: number | null;
  placeName: string;
  placeAddress: string | null;
  placeCity: string | null;
  placeOsmId: string | null;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  locationSource: "gps" | "manual" | "place" | "stored" | null;
  priceInput: string;
  currency: string;
  overall: number | null;
  ratings: DraftRatings;
  companionIds: string[];
  note: string;
  photoKey: string | null;
  photoUrl: string | null;
};

type Store = {
  draft: EntryDraft | null;
  start: (draft: EntryDraft) => void;
  update: (patch: Partial<EntryDraft>) => void;
  clear: () => void;
};

export const useEntryDraft = create<Store>()(
  persist(
    (set) => ({
      draft: null,
      start: (draft) => set({ draft }),
      update: (patch) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : s)),
      clear: () => set({ draft: null }),
    }),
    {
      name: "doenerbuch-entwurf",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ draft: s.draft }),
    },
  ),
);

/** Drafts older than this are discarded when opening /neu. */
export const DRAFT_MAX_AGE_MS = 3 * 60 * 60 * 1000;

/** True once the draft was restored from sessionStorage (always false on the server). */
export function useDraftHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useEntryDraft.persist.onFinishHydration(onChange),
    () => useEntryDraft.persist.hasHydrated(),
    () => false,
  );
}
