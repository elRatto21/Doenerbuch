"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Camera, Check, ChevronDown, Clock, Crosshair, Expand, Loader2, MapPin, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { LocationPicker } from "@/components/map/location-picker";
import { MiniMap } from "@/components/map/mini-map";
import { GEO_ERROR_TEXT, useGeolocation } from "@/hooks/use-geolocation";
import { currencySymbol, firstName, formatDistance, formatPrice, parsePrice, priceInputValue } from "@/lib/format";
import { normalizePlaceName } from "@/lib/geo";
import { UploadError, uploadImage } from "@/lib/upload-client";
import { CURRENCIES, MEAT_LABEL, MEATS, type EntryInput } from "@/lib/validation";
import { saveEntryAction, suggestPlacesAction } from "@/server/actions/entries";
import type { PlaceSuggestion } from "@/server/queries/places";
import { DRAFT_MAX_AGE_MS, useDraftHydrated, useEntryDraft, type EntryDraft } from "@/stores/entry-draft";

export type Prefill = {
  key: string;
  editId?: number;
  eatenAt?: string;
  typeId?: number;
  meat?: EntryDraft["meat"];
  placeId?: number;
  placeName?: string;
  placeAddress?: string | null;
  placeCity?: string | null;
  placeLat?: number;
  placeLng?: number;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  priceCents?: number | null;
  currency?: string;
  companionIds?: string[];
  photoKey?: string | null;
  photoUrl?: string | null;
};

type Props = {
  types: { id: number; name: string }[];
  prefill: Prefill;
  autoGps: boolean;
  defaultCurrency: string;
  lastPrice: { cents: number; currency: string } | null;
  friends: { id: string; name: string; avatarUrl: string | null }[];
  photosEnabled: boolean;
  /** Start of the map picker when there's no position yet (last entry's place). */
  fallbackCenter: { lat: number; lng: number } | null;
};

function buildDraft(prefill: Prefill, types: Props["types"], defaultCurrency: string): EntryDraft {
  const when = prefill.eatenAt ? new Date(prefill.eatenAt) : new Date();
  const hasOwnFix = prefill.lat != null && prefill.lng != null;
  const hasPlace = prefill.placeLat != null && prefill.placeLng != null;
  return {
    key: prefill.key,
    startedAt: Date.now(),
    editId: prefill.editId ?? null,
    date: format(when, "yyyy-MM-dd"),
    time: format(when, "HH:mm"),
    typeId: prefill.typeId ?? types[0]?.id ?? null,
    meat: prefill.meat ?? "kalb",
    placeId: prefill.placeId ?? null,
    placeName: prefill.placeName ?? "",
    placeAddress: prefill.placeAddress ?? null,
    placeCity: prefill.placeCity ?? null,
    placeOsmId: null,
    lat: hasOwnFix ? prefill.lat! : hasPlace ? prefill.placeLat! : null,
    lng: hasOwnFix ? prefill.lng! : hasPlace ? prefill.placeLng! : null,
    accuracyM: hasOwnFix ? (prefill.accuracyM ?? null) : null,
    locationSource: hasOwnFix ? "stored" : hasPlace ? "place" : null,
    priceInput: priceInputValue(prefill.priceCents),
    currency: prefill.currency ?? defaultCurrency,
    companionIds: prefill.companionIds ?? [],
    photoKey: prefill.photoKey ?? null,
    photoUrl: prefill.photoUrl ?? null,
  };
}

function dateLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(new Date(Date.now() - 86_400_000), "yyyy-MM-dd");
  const short = format(d, "dd.MM.", { locale: de });
  if (date === today) return `Heute, ${short}`;
  if (date === yesterday) return `Gestern, ${short}`;
  return format(d, "EEE, dd.MM.yy", { locale: de });
}

export function EntryForm({ types, prefill, autoGps, defaultCurrency, lastPrice, friends, photosEnabled, fallbackCenter }: Props) {
  const router = useRouter();
  const { draft, start, update } = useEntryDraft();
  const hydrated = useDraftHydrated();
  const { state: geo, locate } = useGeolocation();
  const [nearby, setNearby] = useState<PlaceSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlaceSuggestion | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const startedRef = useRef(false);
  // set once saved, so clearing the draft doesn't restart the form
  const savedRef = useRef(false);
  // last reverse-geocoding result, used when the user renames a chosen place
  const reverseRef = useRef<{ address: string | null; city: string | null; osmId: string | null } | null>(null);

  // (Re)start the draft when opening a different flow or when it is stale.
  useEffect(() => {
    if (!hydrated || startedRef.current || savedRef.current) return;
    startedRef.current = true;
    const current = useEntryDraft.getState().draft;
    const stale = !current || current.key !== prefill.key || Date.now() - current.startedAt > DRAFT_MAX_AGE_MS;
    if (stale) {
      start(buildDraft(prefill, types, defaultCurrency));
      if (autoGps && !prefill.editId) void relocate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after hydration
  }, [hydrated]);

  const resolveLocation = useCallback(
    async (pos: { lat: number; lng: number }) => {
      setResolving(true);
      try {
        const [suggestions, reverse] = await Promise.all([
          suggestPlacesAction({ lat: pos.lat, lng: pos.lng, q: null }).catch(() => [] as PlaceSuggestion[]),
          fetch(`/api/geocode?lat=${pos.lat}&lng=${pos.lng}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null) as Promise<{ address: string | null; city: string | null; poiName: string | null; osmId: string | null } | null>,
        ]);
        setNearby(suggestions);
        reverseRef.current = reverse ? { address: reverse.address, city: reverse.city, osmId: reverse.osmId } : null;
        const d = useEntryDraft.getState().draft;
        if (!d) return;
        const closest = suggestions[0];
        if (!d.placeName.trim() && closest && (closest.distanceM ?? Infinity) <= 50) {
          choose(closest);
          return;
        }
        if (!d.placeId) {
          update({
            placeAddress: reverse?.address ?? d.placeAddress,
            placeCity: reverse?.city ?? d.placeCity,
            placeOsmId: reverse?.osmId ?? null,
            placeName: d.placeName.trim() ? d.placeName : (reverse?.poiName ?? ""),
          });
        }
      } finally {
        setResolving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update],
  );

  async function relocate() {
    const fix = await locate();
    if (!fix) return;
    update({ lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM, locationSource: "gps" });
    await resolveLocation(fix);
  }

  function pickOnMap(pos: { lat: number; lng: number }) {
    update({ lat: pos.lat, lng: pos.lng, accuracyM: null, locationSource: "manual" });
    void resolveLocation(pos);
  }

  function choose(s: PlaceSuggestion) {
    setSelectedSuggestion(s);
    const d = useEntryDraft.getState().draft;
    const hasFix = d?.locationSource === "gps" || d?.locationSource === "manual" || d?.locationSource === "stored";
    update({
      placeId: s.id,
      placeName: s.name,
      placeAddress: s.address,
      placeCity: s.city,
      placeOsmId: null,
      ...(hasFix ? {} : { lat: s.lat, lng: s.lng, accuracyM: null, locationSource: "place" as const }),
    });
  }

  const lastForPlace = selectedSuggestion?.lastPriceCents != null ? { cents: selectedSuggestion.lastPriceCents, currency: selectedSuggestion.lastCurrency ?? defaultCurrency } : null;
  const priceSuggestion = lastForPlace ?? lastPrice;

  function toggleFriend(id: string) {
    if (!draft) return;
    const has = draft.companionIds.includes(id);
    update({ companionIds: has ? draft.companionIds.filter((x) => x !== id) : [...draft.companionIds, id] });
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setErrors([]);
    try {
      const key = await uploadImage(file, "entry");
      update({ photoKey: key, photoUrl: URL.createObjectURL(file) });
    } catch (err) {
      setErrors([err instanceof UploadError ? err.message : "Foto konnte nicht hochgeladen werden."]);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!draft) return;
    const problems: string[] = [];
    if (!draft.typeId) problems.push("Wähl eine Sorte.");
    if (!draft.placeName.trim()) problems.push("Wie heißt der Imbiss?");
    if (!draft.placeId && (draft.lat == null || draft.lng == null)) problems.push("Standort fehlt – orten oder auf der Karte tippen.");
    if (draft.priceInput.trim() && parsePrice(draft.priceInput) == null) problems.push("Der Preis sieht komisch aus, z. B. 7,50.");
    setErrors(problems);
    if (problems.length > 0) return;

    const fromPlace = draft.locationSource === "place";
    const input: EntryInput = {
      eatenAt: new Date(`${draft.date}T${draft.time}`).toISOString(),
      typeId: draft.typeId!,
      meat: draft.meat,
      placeId: draft.placeId,
      placeName: draft.placeName.trim(),
      placeAddress: draft.placeAddress,
      placeCity: draft.placeCity,
      placeOsmId: draft.placeOsmId,
      // coordinates copied from a known place are not an own GPS fix – unless a new place needs them
      lat: fromPlace && draft.placeId ? null : draft.lat,
      lng: fromPlace && draft.placeId ? null : draft.lng,
      accuracyM: draft.locationSource === "gps" || draft.locationSource === "stored" ? draft.accuracyM : null,
      priceCents: parsePrice(draft.priceInput),
      currency: draft.currency as EntryInput["currency"],
      photoKey: draft.photoKey,
      companionIds: draft.companionIds.filter((id) => friends.some((f) => f.id === id)),
    };
    setSaving(true);
    const result = await saveEntryAction(input, draft.editId);
    if (!result.ok) {
      setSaving(false);
      setErrors([result.error]);
      return;
    }
    savedRef.current = true;
    const params = new URLSearchParams({ gespeichert: draft.editId ? "bearbeitet" : "neu" });
    if (result.badges.length > 0) params.set("abzeichen", result.badges.join(","));
    router.replace(`/eintrag/${result.id}?${params}`);
    useEntryDraft.getState().clear();
  }

  const position = useMemo(() => (draft?.lat != null && draft?.lng != null ? { lat: draft.lat, lng: draft.lng } : null), [draft?.lat, draft?.lng]);

  if (!draft) {
    return (
      <main>
        <PageHeader title={prefill.editId ? "Bearbeiten" : "Neuer Döner"} backHref="/" variant="close" />
        <div className="flex justify-center p-10 text-muted" role="status">
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span className="sr-only">Lädt …</span>
        </div>
      </main>
    );
  }

  const backHref = draft.editId ? `/eintrag/${draft.editId}` : "/";

  return (
    <main>
      <PageHeader
        title={draft.editId ? "Bearbeiten" : "Neuer Döner"}
        backHref={backHref}
        variant="close"
      />

      <form
        className="flex flex-col gap-[18px] px-5 pt-4 pb-[calc(150px+env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="display mb-2 p-0 text-base font-bold">Wann?</legend>
          <div className="grid grid-cols-2 gap-2.5">
            <PickerButton icon={<Calendar size={18} aria-hidden="true" />} label={dateLabel(draft.date)} srLabel="Datum">
              <input type="date" value={draft.date} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => e.target.value && update({ date: e.target.value })} />
            </PickerButton>
            <PickerButton icon={<Clock size={18} aria-hidden="true" />} label={draft.time} srLabel="Uhrzeit">
              <input type="time" value={draft.time} onChange={(e) => e.target.value && update({ time: e.target.value })} />
            </PickerButton>
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className="display mb-2 p-0 text-base font-bold">Was?</legend>
          <div className="grid grid-cols-2 gap-2.5">
            <SelectField id="sorte" label="Sorte" value={draft.typeId ?? ""} onChange={(v) => update({ typeId: v ? Number(v) : null })}>
              {draft.typeId == null ? (
                <option value="" disabled>
                  Sorte wählen
                </option>
              ) : null}
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectField>
            <SelectField id="fleisch" label="Fleisch" value={draft.meat} onChange={(v) => update({ meat: v as EntryDraft["meat"] })}>
              {MEATS.map((m) => (
                <option key={m} value={m}>
                  {MEAT_LABEL[m]}
                </option>
              ))}
            </SelectField>
          </div>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="display mb-2 p-0 text-base font-bold">Wo?</legend>
          <PlaceCombobox
            value={draft.placeName}
            lat={draft.lat}
            lng={draft.lng}
            nearby={nearby}
            onChange={(v) => {
              const keepsPlace = selectedSuggestion && normalizePlaceName(v) === normalizePlaceName(selectedSuggestion.name);
              const keepsPrefill = !selectedSuggestion && draft.placeId && normalizePlaceName(v) === normalizePlaceName(prefill.placeName ?? "");
              const keeps = Boolean(keepsPlace || keepsPrefill);
              update({
                placeName: v,
                placeId: keeps ? draft.placeId : null,
                // a new name is a new place: don't inherit the chosen place's address
                ...(!keeps && draft.placeId
                  ? { placeAddress: reverseRef.current?.address ?? null, placeCity: reverseRef.current?.city ?? null, placeOsmId: reverseRef.current?.osmId ?? null }
                  : {}),
              });
              if (!keepsPlace) setSelectedSuggestion(null);
            }}
            onChoose={choose}
          />
          <div className="card overflow-hidden rounded-[14px]">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label={position ? "Ort auf der Karte ändern" : "Ort auf der Karte setzen"}
              className="relative block h-[120px] w-full cursor-pointer border-0 bg-transparent p-0"
            >
              {position ? (
                <>
                  <MiniMap position={position} accuracyM={draft.accuracyM} attribution={false} className="pointer-events-none h-full" />
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg border-2 border-ink bg-surface px-2 py-1 text-xs font-bold shadow-hard-sm">
                    <Expand size={14} strokeWidth={2.4} aria-hidden="true" />
                    Ändern
                  </span>
                </>
              ) : (
                <span className="map-placeholder flex h-full w-full items-center justify-center">
                  <span className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-surface px-3 py-1.5 text-sm font-bold shadow-hard-sm">
                    <MapPin size={16} strokeWidth={2.4} className="text-accent" aria-hidden="true" />
                    Auf der Karte setzen
                  </span>
                </span>
              )}
            </button>
            <div className="flex items-center justify-between gap-2 border-t-2 border-ink px-3 py-2.5">
              <LocationStatus draft={draft} geo={geo} resolving={resolving} />
              <button type="button" className="btn btn-mustard h-11 shrink-0 rounded-[10px] px-3 text-[13px]" onClick={() => void relocate()} disabled={geo.status === "locating"}>
                {geo.status === "locating" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Crosshair size={16} strokeWidth={2.2} aria-hidden="true" />}
                {draft.lat == null ? "Orten" : "Neu orten"}
              </button>
            </div>
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="preis" className="display text-base font-bold">
            Preis
          </label>
          <div className="flex gap-2">
            <div className="flex h-[52px] flex-1 items-center gap-1.5 rounded-xl border-2 border-ink bg-surface px-3.5">
              <label className="relative flex items-center">
                <span className="sr-only">Währung</span>
                <span className="display text-[22px] font-extrabold" aria-hidden="true">
                  {currencySymbol(draft.currency)}
                </span>
                <select
                  value={draft.currency}
                  onChange={(e) => update({ currency: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Währung"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <input
                id="preis"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                autoComplete="off"
                value={draft.priceInput}
                onChange={(e) => update({ priceInput: e.target.value })}
                className="display w-full min-w-0 border-0 bg-transparent text-[22px] font-extrabold text-ink outline-none placeholder:text-muted/40"
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary h-[52px] px-3 text-[13px] font-medium"
              disabled={!priceSuggestion}
              title={priceSuggestion ? formatPrice(priceSuggestion.cents, priceSuggestion.currency) : undefined}
              onClick={() => priceSuggestion && update({ priceInput: priceInputValue(priceSuggestion.cents), currency: priceSuggestion.currency })}
            >
              wie letztes Mal
            </button>
          </div>
        </div>

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
                  className={`flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 border-ink pl-1 pr-3 text-sm ${on ? "bg-mustard font-bold" : "bg-surface font-medium"}`}
                >
                  <Avatar name={f.name} imageUrl={f.avatarUrl} size={30} className={on ? "!bg-surface" : ""} />
                  {firstName(f.name)}
                </button>
              );
            })}
            <Link href="/freunde/hinzufuegen" aria-label="Freund hinzufügen" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-ink text-ink">
              <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
          {friends.length === 0 ? <p className="m-0 text-[13px] text-muted">Noch keine Freunde – lade welche ein, um sie zu markieren.</p> : null}
        </section>

        {photosEnabled ? (
          <section aria-labelledby="foto" className="flex flex-col gap-2">
            <h2 id="foto" className="display m-0 text-base font-bold">
              Foto
            </h2>
            {draft.photoUrl ? (
              <div className="relative h-44 overflow-hidden rounded-[14px] border-2 border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview / presigned URL */}
                <img src={draft.photoUrl} alt="Foto vom Döner" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Foto entfernen"
                  onClick={() => update({ photoKey: null, photoUrl: null })}
                  className="icon-btn absolute right-2 top-2 h-10 w-10 rounded-full"
                >
                  <X size={18} strokeWidth={2.6} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="flex h-24 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-ink bg-surface text-[15px] font-bold focus-within:outline-3 focus-within:outline-accent">
                {uploading ? <Loader2 size={22} className="animate-spin" aria-hidden="true" /> : <Camera size={22} aria-hidden="true" />}
                {uploading ? "Wird hochgeladen …" : "Foto aufnehmen"}
                <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={uploading} onChange={(e) => void onPhoto(e.target.files?.[0])} />
              </label>
            )}
          </section>
        ) : null}

        {pickerOpen ? (
          <LocationPicker initial={position} fallbackCenter={fallbackCenter} onConfirm={pickOnMap} onClose={() => setPickerOpen(false)} />
        ) : null}

        {errors.length > 0 ? (
          <ul role="alert" className="m-0 flex list-none flex-col gap-1 rounded-xl border-2 border-ink bg-accent-soft px-3 py-2 text-sm font-medium">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t-2 border-ink bg-ground px-5 pt-3.5 safe-bottom md:border-x-2">
          <button type="submit" className="btn btn-primary w-full" disabled={saving || uploading} aria-busy={saving}>
            {saving ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Check size={20} strokeWidth={2.6} aria-hidden="true" />}
            {draft.editId ? "Änderungen speichern" : "Ins Dönerbuch eintragen"}
          </button>
          {!draft.editId ? <p className="m-0 mt-2 text-center text-xs text-muted">Bewerten kannst du ihn, wenn du fertig gegessen hast.</p> : null}
        </div>
      </form>
    </main>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-bold text-muted">
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field cursor-pointer appearance-none truncate pr-10 text-base">
          {children}
        </select>
        <ChevronDown size={20} strokeWidth={2.4} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

/** A styled button with a transparent native date/time input on top. */
function PickerButton({ icon, label, srLabel, children }: { icon: React.ReactNode; label: string; srLabel: string; children: React.ReactElement }) {
  return (
    <label className="relative flex h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-ink bg-surface px-3 text-[15px] font-medium focus-within:outline-3 focus-within:outline-accent">
      {icon}
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{srLabel}</span>
      <span
        className="absolute inset-0 [&>input]:h-full [&>input]:w-full [&>input]:cursor-pointer [&>input]:opacity-0"
        onClick={(e) => {
          const input = e.currentTarget.querySelector("input");
          try {
            input?.showPicker?.();
          } catch {
            /* not supported – native focus still works */
          }
        }}
      >
        {children}
      </span>
    </label>
  );
}

function LocationStatus({
  draft,
  geo,
  resolving,
}: {
  draft: EntryDraft;
  geo: ReturnType<typeof useGeolocation>["state"];
  resolving: boolean;
}) {
  let title = "Kein Standort";
  let detail: string | null = "Orten oder auf die Karte tippen";
  if (geo.status === "locating") {
    title = "Wird geortet …";
    detail = null;
  } else if (geo.status === "error" && draft.lat == null) {
    title = "Kein Standort";
    detail = GEO_ERROR_TEXT[geo.reason];
  } else if (draft.lat != null) {
    title =
      draft.locationSource === "gps"
        ? "Standort erfasst"
        : draft.locationSource === "manual"
          ? "Ort auf Karte gesetzt"
          : draft.locationSource === "stored"
            ? "Gespeicherter Standort"
            : "Ort aus deinem Dönerbuch";
    const parts = [draft.placeAddress ?? (resolving ? "Adresse wird gesucht …" : null), draft.accuracyM != null ? `±${draft.accuracyM} m` : null].filter(Boolean);
    detail = parts.join(" · ") || null;
  }
  return (
    <div className="flex min-w-0 flex-col" aria-live="polite">
      <span className="text-sm font-bold">{title}</span>
      {detail ? <span className="text-xs text-muted">{detail}</span> : null}
    </div>
  );
}

function PlaceCombobox({
  value,
  lat,
  lng,
  nearby,
  onChange,
  onChoose,
}: {
  value: string;
  lat: number | null;
  lng: number | null;
  nearby: PlaceSuggestion[];
  onChange: (v: string) => void;
  onChoose: (s: PlaceSuggestion) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[] | null>(null);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(q: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!q.trim()) {
        setResults(null);
        return;
      }
      setResults(await suggestPlacesAction({ lat, lng, q }).catch(() => []));
      setActive(-1);
    }, 200);
  }

  const options = (results ?? nearby).slice(0, 6);
  const showList = open && options.length > 0;

  function pick(s: PlaceSuggestion) {
    onChoose(s);
    setOpen(false);
    setResults(null);
  }

  return (
    <div className="relative">
      <label htmlFor="ort" className="sr-only">
        Name des Imbiss
      </label>
      <input
        id="ort"
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Name des Imbiss"
        autoComplete="off"
        className="field text-base"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          search(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(options[active]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList ? (
        <ul id={listId} role="listbox" aria-label="Vorschläge" className="card absolute left-0 right-0 top-[calc(100%+6px)] z-20 m-0 list-none overflow-hidden rounded-xl p-0">
          {options.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className={`flex min-h-12 cursor-pointer items-center gap-2.5 px-3 py-2 ${i > 0 ? "border-t-2 border-hairline" : ""} ${i === active ? "bg-ground" : ""}`}
            >
              <MapPin size={18} className="shrink-0 text-accent" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-bold">{s.name}</span>
                <span className="truncate text-xs text-muted">
                  {[s.address, s.distanceM != null ? formatDistance(s.distanceM) : null, s.myVisits > 0 ? `${s.myVisits}× da gewesen` : s.friendVisits > 0 ? "von Freunden" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
