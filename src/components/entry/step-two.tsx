"use client";

import { Camera, Check, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { StarIcon } from "@/components/stars";
import { firstName, formatPrice, parsePrice } from "@/lib/format";
import { uploadImage } from "@/lib/upload-client";
import { RATING_CATEGORIES, type EntryInput, type RatingKey } from "@/lib/validation";
import { saveEntryAction } from "@/server/actions/entries";
import { useDraftHydrated, useEntryDraft } from "@/stores/entry-draft";
import { ProgressBar } from "./progress-bar";

type Props = {
  friends: { id: string; name: string; avatarUrl: string | null }[];
  types: { id: number; name: string }[];
  photosEnabled: boolean;
};

export function StepTwo({ friends, types, photosEnabled }: Props) {
  const router = useRouter();
  const { draft, update, clear } = useEntryDraft();
  const hydrated = useDraftHydrated();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // set once saved, so clearing the draft doesn't bounce back to step 1
  const savedRef = useRef(false);

  useEffect(() => {
    if (hydrated && !draft && !savedRef.current) router.replace("/neu");
  }, [hydrated, draft, router]);

  if (!draft) {
    return (
      <div className="flex justify-center p-10 text-muted" role="status">
        <Loader2 className="animate-spin" aria-hidden="true" />
        <span className="sr-only">Lädt …</span>
      </div>
    );
  }

  const typeName = types.find((t) => t.id === draft.typeId)?.name ?? "";
  const priceCents = parsePrice(draft.priceInput);

  function setOverall(value: number) {
    const allEmpty = Object.values(draft!.ratings).every((v) => v == null);
    update({
      overall: value,
      // first pick pre-fills the categories so the details are a quick tweak
      ratings: allEmpty ? (Object.fromEntries(RATING_CATEGORIES.map((c) => [c.key, value])) as Record<RatingKey, number>) : draft!.ratings,
    });
  }

  function toggleFriend(id: string) {
    const has = draft!.companionIds.includes(id);
    update({ companionIds: has ? draft!.companionIds.filter((x) => x !== id) : [...draft!.companionIds, id] });
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const key = await uploadImage(file, "entry");
      update({ photoKey: key, photoUrl: URL.createObjectURL(file) });
    } catch {
      setError("Foto konnte nicht hochgeladen werden.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.overall) {
      setError("Gib noch eine Gesamtbewertung (1–5 Sterne).");
      return;
    }
    const eatenAt = new Date(`${draft.date}T${draft.time}`);
    const input: EntryInput = {
      eatenAt: eatenAt.toISOString(),
      typeId: draft.typeId!,
      meat: draft.meat,
      placeId: draft.placeId,
      placeName: draft.placeName.trim(),
      placeAddress: draft.placeAddress,
      placeCity: draft.placeCity,
      placeOsmId: draft.placeOsmId,
      lat: draft.locationSource === "place" ? null : draft.lat,
      lng: draft.locationSource === "place" ? null : draft.lng,
      accuracyM: draft.locationSource === "gps" || draft.locationSource === "stored" ? draft.accuracyM : null,
      priceCents,
      currency: draft.currency as EntryInput["currency"],
      overall: draft.overall,
      ...draft.ratings,
      note: draft.note.trim() || null,
      photoKey: draft.photoKey,
      companionIds: draft.companionIds.filter((id) => friends.some((f) => f.id === id)),
    };
    // a chosen place without own GPS still needs coordinates for a new place
    if (input.placeId == null && input.lat == null) {
      input.lat = draft.lat;
      input.lng = draft.lng;
    }
    setSaving(true);
    setError(null);
    const result = await saveEntryAction(input, draft.editId);
    if (!result.ok) {
      setSaving(false);
      setError(result.error);
      return;
    }
    savedRef.current = true;
    const params = new URLSearchParams({ gespeichert: draft.editId ? "bearbeitet" : "neu" });
    if (result.badges.length > 0) params.set("abzeichen", result.badges.join(","));
    router.replace(`/eintrag/${result.id}?${params}`);
    clear();
  }

  const overall = draft.overall ?? 0;

  return (
    <main>
      <PageHeader title="Bewertung" backHref="/neu" right={<span className="text-[13px] font-bold text-muted">2/2</span>} />
      <ProgressBar value={1} />

      <div className="pb-cta flex flex-col gap-3.5 px-5 pt-3.5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {typeName ? <span className="chip text-xs">{typeName}</span> : null}
          <span className="font-bold">{draft.placeName}</span>
          {priceCents != null ? <span className="text-muted">· {formatPrice(priceCents, draft.currency)}</span> : null}
        </div>

        <section aria-labelledby="gesamt" className="card flex items-center justify-between p-3.5">
          <div>
            <h2 id="gesamt" className="m-0 text-[13px] font-bold text-muted">
              Gesamt
            </h2>
            <div className="display text-[44px] font-extrabold leading-none tabular-nums">
              {draft.overall ?? "–"}
              <span className="text-xl text-muted">/5</span>
            </div>
          </div>
          <div role="radiogroup" aria-label="Gesamtbewertung" className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={i === draft.overall}
                aria-label={`${i} ${i === 1 ? "Stern" : "Sterne"}`}
                onClick={() => setOverall(i)}
                className="flex h-11 w-10 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
              >
                <StarIcon size={34} filled={i <= overall} strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="kat" className="card-flat flex flex-col gap-1.5 rounded-2xl px-3.5 py-3">
          <h2 id="kat" className="display m-0 mb-1 text-base font-bold">
            Im Detail <span className="text-[13px] font-medium text-muted">(optional)</span>
          </h2>
          {RATING_CATEGORIES.map((c) => {
            const value = draft.ratings[c.key];
            return (
              <div key={c.key} role="radiogroup" aria-label={c.label} className="grid grid-cols-[110px_1fr] items-center gap-2.5">
                <span className="text-sm font-medium">{c.label}</span>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((i) => {
                    const filled = value != null && i <= value;
                    return (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={i === value}
                        aria-label={`${c.label}: ${i} von 5`}
                        onClick={() => update({ ratings: { ...draft.ratings, [c.key]: value === i ? null : i } })}
                        className={`relative h-[22px] cursor-pointer rounded-md border-[1.5px] border-ink p-0 after:absolute after:-inset-y-[11px] after:inset-x-0 after:content-[''] ${
                          filled ? (i === 5 ? "bg-accent" : "bg-mustard") : "bg-ground"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <section aria-labelledby="wer" className="flex flex-col gap-2">
          <h2 id="wer" className="display m-0 text-base font-bold">
            Mit wem?
          </h2>
          <div className="flex flex-wrap gap-2">
            {friends.map((f) => {
              const on = draft.companionIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleFriend(f.id)}
                  className={`flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 border-ink pl-1 pr-3 text-sm ${
                    on ? "bg-mustard font-bold" : "bg-surface font-medium"
                  }`}
                >
                  <Avatar name={f.name} imageUrl={f.avatarUrl} size={30} className={on ? "!bg-surface" : ""} />
                  {firstName(f.name)}
                </button>
              );
            })}
            <Link
              href="/freunde/hinzufuegen"
              aria-label="Freund hinzufügen"
              className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-ink text-ink"
            >
              <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
          {friends.length === 0 ? <p className="m-0 text-[13px] text-muted">Noch keine Freunde – lade welche ein, um sie zu markieren.</p> : null}
        </section>

        <div className="flex gap-2">
          <label htmlFor="notiz" className="sr-only">
            Notiz
          </label>
          <textarea
            id="notiz"
            rows={2}
            maxLength={1000}
            placeholder="Notiz, z. B. „extra scharf, Brot frisch“"
            value={draft.note}
            onChange={(e) => update({ note: e.target.value })}
            className="min-h-[60px] flex-1 resize-none rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-muted"
          />
          {photosEnabled ? (
            draft.photoUrl ? (
              <div className="relative w-[60px] shrink-0 overflow-hidden rounded-xl border-2 border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview / presigned URL */}
                <img src={draft.photoUrl} alt="Foto vom Döner" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Foto entfernen"
                  onClick={() => update({ photoKey: null, photoUrl: null })}
                  className="absolute right-0.5 top-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-ink bg-surface p-0"
                >
                  <X size={14} strokeWidth={2.6} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="flex w-[60px] shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-ink bg-surface focus-within:outline-3 focus-within:outline-accent">
                <span className="sr-only">Foto hinzufügen</span>
                {uploading ? <Loader2 size={22} className="animate-spin" aria-hidden="true" /> : <Camera size={22} aria-hidden="true" />}
                <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={uploading} onChange={(e) => void onPhoto(e.target.files?.[0])} />
              </label>
            )
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="m-0 rounded-xl border-2 border-ink bg-accent-soft px-3 py-2 text-sm font-medium">
            {error}
          </p>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t-2 border-ink bg-ground px-5 pt-3.5 safe-bottom md:border-x-2">
        <button type="button" className="btn btn-primary w-full" onClick={() => void save()} disabled={saving || uploading} aria-busy={saving}>
          {saving ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Check size={20} strokeWidth={2.6} aria-hidden="true" />}
          {draft.editId ? "Änderungen speichern" : "Ins Dönerbuch eintragen"}
        </button>
      </div>
    </main>
  );
}
