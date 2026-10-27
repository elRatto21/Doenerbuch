import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

export function JournalFilter({
  types,
  typeId,
  minRating,
  q,
}: {
  types: { id: number; name: string }[];
  typeId: number | null;
  minRating: number | null;
  q: string;
}) {
  const active = Boolean(typeId || minRating || q);
  return (
    <details className="group relative">
      <summary
        className={`flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-full border-2 border-ink px-3.5 text-[13px] font-medium [&::-webkit-details-marker]:hidden ${
          active ? "bg-mustard font-bold" : "bg-surface"
        }`}
      >
        <SlidersHorizontal size={14} strokeWidth={2.2} aria-hidden="true" />
        Filter{active ? " aktiv" : ""}
      </summary>
      <form method="get" action="/" className="card absolute right-0 top-[calc(100%+8px)] z-20 flex w-[min(320px,calc(100vw-40px))] flex-col gap-3 p-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q" className="text-sm font-bold">
            Suche
          </label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Imbiss, Adresse, Notiz" className="field" />
        </div>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1.5 p-0 text-sm font-bold">Sorte</legend>
          <div className="flex flex-wrap gap-1.5">
            <RadioPill name="sorte" value="" label="Alle" checked={!typeId} />
            {types.map((t) => (
              <RadioPill key={t.id} name="sorte" value={String(t.id)} label={t.name} checked={typeId === t.id} />
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1.5 p-0 text-sm font-bold">Bewertung</legend>
          <div className="flex flex-wrap gap-1.5">
            <RadioPill name="min" value="" label="Alle" checked={!minRating} />
            {[3, 4, 5].map((n) => (
              <RadioPill key={n} name="min" value={String(n)} label={n === 5 ? "5 ★" : `ab ${n} ★`} checked={minRating === n} />
            ))}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <Link href="/" className="btn btn-secondary h-11 flex-1 text-sm">
            Zurücksetzen
          </Link>
          <button type="submit" className="btn btn-mustard h-11 flex-1 text-sm">
            Anwenden
          </button>
        </div>
      </form>
    </details>
  );
}

function RadioPill({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="pill h-9 px-3 text-[13px] peer-checked:bg-mustard peer-checked:font-bold peer-checked:shadow-hard-sm peer-focus-visible:outline-3 peer-focus-visible:outline-accent">
        {label}
      </span>
    </label>
  );
}
