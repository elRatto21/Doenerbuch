"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StarIcon } from "@/components/stars";
import { formatPrice } from "@/lib/format";
import { RATING_CATEGORIES, type RatingKey } from "@/lib/validation";
import { rateEntryAction } from "@/server/actions/entries";

type Ratings = Record<RatingKey, number | null>;

type Props = {
  entryId: number;
  summary: { typeName: string; placeName: string; priceCents: number | null; currency: string; photoUrl: string | null };
  initial: { overall: number | null; ratings: Ratings; note: string };
};

export function RatingForm({ entryId, summary, initial }: Props) {
  const router = useRouter();
  const [overall, setOverall] = useState<number | null>(initial.overall);
  const [ratings, setRatings] = useState<Ratings>(initial.ratings);
  const [note, setNote] = useState(initial.note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = initial.overall != null;

  function pickOverall(value: number) {
    // first pick pre-fills the categories so the details are a quick tweak
    if (Object.values(ratings).every((v) => v == null)) {
      setRatings(Object.fromEntries(RATING_CATEGORIES.map((c) => [c.key, value])) as Ratings);
    }
    setOverall(value);
  }

  async function save() {
    if (!overall) {
      setError("Gib noch eine Gesamtbewertung (1–5 Sterne).");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await rateEntryAction(entryId, { overall, ...ratings, note: note.trim() || null });
    if (!result.ok) {
      setSaving(false);
      setError(result.error);
      return;
    }
    const params = new URLSearchParams({ gespeichert: "bewertet" });
    if (result.badges.length > 0) params.set("abzeichen", result.badges.join(","));
    router.replace(`/eintrag/${entryId}?${params}`);
  }

  return (
    <main>
      <PageHeader title="Bewertung" backHref={`/eintrag/${entryId}`} />

      <div className="pb-cta flex flex-col gap-3.5 px-5 pt-3">
        <div className="flex items-center gap-3">
          {summary.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed/public S3 URL
            <img src={summary.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border-2 border-ink object-cover" />
          ) : null}
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <span className="chip text-xs">{summary.typeName}</span>
            <span className="font-bold">{summary.placeName}</span>
            {summary.priceCents != null ? <span className="text-muted">· {formatPrice(summary.priceCents, summary.currency)}</span> : null}
          </div>
        </div>

        <section aria-labelledby="gesamt" className="card flex items-center justify-between p-3.5">
          <div>
            <h2 id="gesamt" className="m-0 text-[13px] font-bold text-muted">
              Gesamt
            </h2>
            <div className="display text-[44px] font-extrabold leading-none tabular-nums">
              {overall ?? "–"}
              <span className="text-xl text-muted">/5</span>
            </div>
          </div>
          <div role="radiogroup" aria-label="Gesamtbewertung" className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={i === overall}
                aria-label={`${i} ${i === 1 ? "Stern" : "Sterne"}`}
                onClick={() => pickOverall(i)}
                className="flex h-11 w-10 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
              >
                <StarIcon size={34} filled={i <= (overall ?? 0)} strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="kat" className="card-flat flex flex-col gap-1.5 rounded-2xl px-3.5 py-3">
          <h2 id="kat" className="display m-0 mb-1 text-base font-bold">
            Im Detail <span className="text-[13px] font-medium text-muted">(optional)</span>
          </h2>
          {RATING_CATEGORIES.map((c) => {
            const value = ratings[c.key];
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
                        onClick={() => setRatings({ ...ratings, [c.key]: value === i ? null : i })}
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notiz" className="display text-base font-bold">
            Notiz
          </label>
          <textarea
            id="notiz"
            rows={3}
            maxLength={1000}
            placeholder="z. B. „extra scharf, Brot frisch“"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-muted"
          />
        </div>

        {error ? (
          <p role="alert" className="m-0 rounded-xl border-2 border-ink bg-accent-soft px-3 py-2 text-sm font-medium">
            {error}
          </p>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t-2 border-ink bg-ground px-5 pt-3.5 safe-bottom md:border-x-2">
        <button type="button" className="btn btn-primary w-full" onClick={() => void save()} disabled={saving} aria-busy={saving}>
          {saving ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Check size={20} strokeWidth={2.6} aria-hidden="true" />}
          {isEdit ? "Bewertung speichern" : "Bewerten"}
        </button>
      </div>
    </main>
  );
}
