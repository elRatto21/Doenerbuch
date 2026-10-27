import { ArrowLeft, Pencil, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { DeleteEntryButton } from "@/components/detail/delete-entry";
import { SavedNotice } from "@/components/detail/saved-notice";
import { ShareButton } from "@/components/detail/share-button";
import { MiniMap } from "@/components/map/mini-map";
import { BADGES } from "@/lib/badges";
import { firstName, formatPrice, formatRating } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { fmt } from "@/lib/time";
import { MEAT_LABEL, RATING_CATEGORIES } from "@/lib/validation";
import { getEntryForViewer } from "@/server/queries/entries";
import { photoUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Eintrag" };

type Params = { id: string };
type Search = { gespeichert?: string; abzeichen?: string };

export default async function EntryDetailPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const me = await requireUser();
  const { id } = await params;
  const search = await searchParams;
  const entryId = Number(id);
  if (!Number.isInteger(entryId) || entryId <= 0) notFound();
  const data = await getEntryForViewer(me.id, entryId);
  if (!data) notFound();

  const { entry, owner, companions, isOwner, visitsHere } = data;
  const [photo, ownerAvatar] = await Promise.all([photoUrl(entry.photoKey), isOwner ? null : photoUrl(owner.avatarKey)]);
  const ratings = RATING_CATEGORIES.map((c) => ({ ...c, value: entry[c.key] })).filter((c) => c.value != null);
  const position = entry.lat != null && entry.lng != null ? { lat: entry.lat, lng: entry.lng } : { lat: entry.place.lat, lng: entry.place.lng };
  const otherCompanions = companions.filter((c) => c.id !== me.id);
  const withMe = companions.some((c) => c.id === me.id);
  const newBadges = (search.abzeichen ?? "")
    .split(",")
    .map((k) => BADGES.find((b) => b.key === k))
    .filter((b) => b != null);

  return (
    <main className="pb-cta">
      <div className={`relative flex h-[220px] items-center justify-center border-b-2 border-ink ${photo ? "bg-ink" : "map-placeholder"}`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL
          <img src={photo} alt={`Foto vom ${entry.type.name} bei ${entry.place.name}`} className="h-full w-full object-cover" />
        ) : (
          <span role="img" aria-label="Kein Foto" className="rounded-lg border-2 border-ink bg-surface px-2.5 py-1.5 text-[13px] font-bold">
            Kein Foto
          </span>
        )}
        <Link href={isOwner ? "/" : "/freunde"} aria-label={isOwner ? "Zurück zum Journal" : "Zurück zu Freunde"} className="icon-btn absolute left-4 top-4">
          <ArrowLeft size={20} strokeWidth={2.4} aria-hidden="true" />
        </Link>
        {isOwner ? (
          <Link href={`/neu?bearbeiten=${entry.id}`} aria-label="Bearbeiten" className="icon-btn absolute right-4 top-4">
            <Pencil size={18} strokeWidth={2.2} aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-3.5 px-5 pt-4">
        {search.gespeichert ? <SavedNotice kind={search.gespeichert === "bearbeitet" ? "edited" : "new"} badges={newBadges.map((b) => b.name)} /> : null}

        <div>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <span className="chip text-xs">
              {entry.type.name} · {MEAT_LABEL[entry.meat]}
            </span>
            {fmt(entry.eatenAt, "EEEEEE, d. LLLL")} · {fmt(entry.eatenAt, "HH:mm")}
          </div>
          <h1 className="display m-0 mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.5px]">{entry.place.name}</h1>
          {!isOwner ? (
            <p className="m-0 mt-1.5 flex items-center gap-2 text-sm text-muted">
              <Avatar name={owner.name} imageUrl={ownerAvatar} size={24} highlight /> Eintrag von <strong className="text-ink">{firstName(owner.name)}</strong>
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-[14px] border-2 border-ink bg-accent px-3 py-2.5 text-white shadow-hard">
            <div className="display text-2xl font-extrabold leading-none tabular-nums">{formatRating(entry.overall)} ★</div>
            <div className="mt-1 text-xs">Bewertung</div>
          </div>
          <div className="rounded-[14px] border-2 border-ink bg-surface px-3 py-2.5 shadow-hard">
            <div className="display truncate text-2xl font-extrabold leading-none tabular-nums">{formatPrice(entry.priceCents, entry.currency.trim())}</div>
            <div className="mt-1 text-xs text-muted">Preis</div>
          </div>
          <div className="rounded-[14px] border-2 border-ink bg-surface px-3 py-2.5 shadow-hard">
            <div className="display text-2xl font-extrabold leading-none tabular-nums">{visitsHere}×</div>
            <div className="mt-1 text-xs text-muted">hier gewesen</div>
          </div>
        </div>

        {ratings.length > 0 ? (
          <section aria-label="Bewertung im Detail" className="card-flat grid grid-cols-2 gap-x-4 gap-y-2 px-3.5 py-3">
            {ratings.map((c) => (
              <div key={c.key} className="flex flex-col gap-1">
                <div className="flex justify-between text-[13px]">
                  <span>{c.label === "Salat & Gemüse" ? "Salat" : c.label}</span>
                  <span className="font-bold tabular-nums">{c.value}/5</span>
                </div>
                <div className="h-2 overflow-hidden rounded-[5px] border-[1.5px] border-ink bg-ground" aria-hidden="true">
                  <div className={`h-full ${c.value === 5 ? "bg-accent" : "bg-mustard"}`} style={{ width: `${c.value! * 20}%` }} />
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <section aria-label="Ort" className="card-flat flex items-center gap-3 p-2.5">
          <MiniMap position={position} className="h-16 w-16 shrink-0 rounded-[10px] border-[1.5px] border-ink" zoom={15} attribution={false} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold">{entry.place.address ?? entry.place.name}</div>
            <div className="truncate text-[13px] text-muted">
              {isOwner && entry.lat != null
                ? `GPS erfasst${entry.accuracyM != null ? ` · ±${entry.accuracyM} m` : ""}`
                : (entry.place.city ?? "Ort im Dönerbuch")}
            </div>
          </div>
          <Link href={`/karte?ort=${entry.placeId}`} className="btn btn-mustard h-11 rounded-[10px] px-3 text-[13px]">
            Karte
          </Link>
        </section>

        {entry.note || otherCompanions.length > 0 || withMe ? (
          <div className="flex flex-col gap-2">
            {entry.note ? <p className="m-0 whitespace-pre-line text-[15px] leading-[1.45]">„{entry.note}“</p> : null}
            {otherCompanions.length > 0 || withMe ? (
              <div className="flex items-center gap-2 text-[13px] text-muted">
                <span className="flex -space-x-2">
                  {companions.map((c) => (
                    <Avatar key={c.id} name={c.name} size={28} highlight />
                  ))}
                </span>
                <span>
                  Gegessen mit{" "}
                  {[...(withMe ? ["dir"] : []), ...otherCompanions.map((c) => firstName(c.name))].map((n, i, all) => (
                    <span key={n}>
                      <strong className="text-ink">{n}</strong>
                      {i < all.length - 2 ? ", " : i === all.length - 2 ? " und " : ""}
                    </span>
                  ))}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {isOwner ? <DeleteEntryButton entryId={entry.id} /> : null}
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 gap-2.5 border-t-2 border-ink bg-ground px-5 pt-3.5 safe-bottom md:border-x-2">
        <Link href={isOwner ? `/neu?von=${entry.id}` : `/neu?ort=${entry.placeId}`} className="btn btn-primary h-[52px] flex-1 text-base">
          <RotateCcw size={18} strokeWidth={2.4} aria-hidden="true" />
          {isOwner ? "Nochmal hier" : "Auch hier essen"}
        </Link>
        <ShareButton
          title={`${entry.place.name} im Dönerbuch`}
          text={`${entry.type.name} bei ${entry.place.name}: ${formatRating(entry.overall)} von 5 Sternen${entry.priceCents != null ? `, ${formatPrice(entry.priceCents, entry.currency.trim())}` : ""}.`}
        />
      </div>
    </main>
  );
}
