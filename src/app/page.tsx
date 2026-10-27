import Link from "next/link";
import { z } from "zod";
import { AppHeader } from "@/components/journal/app-header";
import { EntryCard } from "@/components/journal/entry-card";
import { JournalFilter } from "@/components/journal/filter";
import { Welcome } from "@/components/journal/welcome";
import { formatRating } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { fmt } from "@/lib/time";
import { journalSummary, listJournal, type JournalEntry } from "@/server/queries/entries";
import { listTypes } from "@/server/queries/types";
import { photoUrl } from "@/server/storage";

const PAGE = 30;

const searchSchema = z.object({
  sorte: z.coerce.number().int().positive().optional().catch(undefined),
  min: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  seiten: z.coerce.number().int().min(1).max(50).optional().catch(undefined),
});

export default async function JournalPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireUser();
  const params = searchSchema.parse(await searchParams);
  const pages = params.seiten ?? 1;
  const filters = { typeId: params.sorte ?? null, minRating: params.min ?? null, q: params.q?.trim() || null };

  const [summary, { entries, hasMore }, types, avatarUrl] = await Promise.all([
    journalSummary(me.id),
    listJournal(me.id, filters, PAGE * pages),
    listTypes(me.id, { includeArchived: true }),
    photoUrl(me.avatarKey),
  ]);

  if (summary.total === 0) {
    return (
      <main>
        <AppHeader name={me.name} avatarUrl={avatarUrl} />
        <Welcome />
      </main>
    );
  }

  const groups = groupByMonth(entries);
  const filtered = Boolean(filters.typeId || filters.minRating || filters.q);
  const moreParams = new URLSearchParams(Object.entries({ ...(await searchParams), seiten: String(pages + 1) }));

  return (
    <main className="pb-nav">
      <AppHeader name={me.name} avatarUrl={avatarUrl} />

      <section aria-label="Statistik" className="grid grid-cols-3 gap-2.5 px-5 pb-4 pt-1">
        <Tile value={String(summary.total)} label="Döner gesamt" />
        <Tile value={formatRating(summary.avgOverall)} label="Ø Bewertung" />
        <Tile value={String(summary.thisMonth)} label="diesen Monat" highlight />
      </section>

      {groups.length === 0 ? (
        <>
          <div className="flex items-center justify-between px-5 pb-2.5 pt-1">
            <h2 className="display m-0 text-lg font-bold">Keine Treffer</h2>
            <JournalFilter types={types} typeId={filters.typeId} minRating={filters.minRating} q={filters.q ?? ""} />
          </div>
          <p className="mx-5 my-0 text-[15px] text-muted">
            Für diesen Filter gibt es keine Einträge.{" "}
            <Link href="/" className="font-bold text-ink">
              Filter zurücksetzen
            </Link>
          </p>
        </>
      ) : (
        groups.map((group, i) => (
          <section key={group.key} aria-labelledby={`m-${group.key}`} className="mb-4">
            <div className="flex items-center justify-between px-5 pb-2.5 pt-1">
              <h2 id={`m-${group.key}`} className="display m-0 text-lg font-bold">
                {group.label}
              </h2>
              {i === 0 ? <JournalFilter types={types} typeId={filters.typeId} minRating={filters.minRating} q={filters.q ?? ""} /> : null}
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 px-5 py-0">
              {group.entries.map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </ul>
          </section>
        ))
      )}

      {hasMore ? (
        <div className="px-5">
          <Link href={`/?${moreParams}`} scroll={false} className="btn btn-secondary h-12 w-full">
            Ältere laden
          </Link>
        </div>
      ) : filtered ? null : (
        <p className="m-0 px-5 py-2 text-center text-[13px] text-muted">Das war&apos;s – ganz unten ist dein erster Döner.</p>
      )}
    </main>
  );
}

function Tile({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[14px] border-2 border-ink p-3 shadow-hard ${highlight ? "bg-mustard" : "bg-surface"}`}>
      <div className="display text-[26px] font-extrabold leading-none tabular-nums">{value}</div>
      <div className={`mt-1.5 text-xs ${highlight ? "text-ink" : "text-muted"}`}>{label}</div>
    </div>
  );
}

function groupByMonth(entries: JournalEntry[]) {
  const groups: { key: string; label: string; entries: JournalEntry[] }[] = [];
  for (const e of entries) {
    const key = fmt(e.eatenAt, "yyyy-MM");
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: fmt(e.eatenAt, "LLLL yyyy"), entries: [] };
      groups.push(group);
    }
    group.entries.push(e);
  }
  return groups;
}
