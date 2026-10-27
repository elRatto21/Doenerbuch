import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { currencySymbol, formatCount, formatPrice, formatRating } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { fmt } from "@/lib/time";
import { getStats, type StatsPeriod } from "@/server/queries/stats";

export const metadata: Metadata = { title: "Statistik" };

const PERIODS: StatsPeriod[] = ["monat", "jahr", "gesamt"];

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ zeitraum?: string }> }) {
  const me = await requireUser();
  const { zeitraum } = await searchParams;
  const period: StatsPeriod = PERIODS.includes(zeitraum as StatsPeriod) ? (zeitraum as StatsPeriod) : "jahr";
  const stats = await getStats(me.id, period);
  const now = new Date();
  const labels: Record<StatsPeriod, string> = { monat: "Monat", jahr: fmt(now, "yyyy"), gesamt: "Gesamt" };
  const emptyText: Record<StatsPeriod, string> = {
    monat: `Im ${fmt(now, "LLLL")} noch kein Döner.`,
    jahr: `${fmt(now, "yyyy")} noch kein Döner.`,
    gesamt: "Noch keine Döner eingetragen.",
  };

  // main currency: the user's setting if used, else the most used one
  const main = stats.spend.find((s) => s.currency === me.settings.currency) ?? stats.spend[0];
  const others = stats.spend.filter((s) => s !== main);
  const maxType = Math.max(1, ...stats.byType.map((t) => t.count));

  return (
    <main className="pb-nav">
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <h1 className="display m-0 text-[26px] font-extrabold tracking-[-0.5px]">Statistik</h1>
        <nav aria-label="Zeitraum" className="flex overflow-hidden rounded-xl border-2 border-ink bg-surface">
          {PERIODS.map((p, i) => (
            <Link
              key={p}
              href={`/statistik?zeitraum=${p}`}
              aria-current={p === period ? "page" : undefined}
              replace
              scroll={false}
              className={`flex h-10 items-center px-3 text-[13px] no-underline ${i > 0 ? "border-l-2 border-ink" : ""} ${
                p === period ? "bg-ink font-bold text-white hover:text-white" : "font-medium text-ink"
              }`}
            >
              {labels[p]}
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex flex-col gap-4 px-5">
        <section aria-label="Überblick" className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border-2 border-ink bg-accent p-3.5 text-white shadow-hard">
            <div className="display text-[40px] font-extrabold leading-none tabular-nums">{formatCount(stats.count)}</div>
            <div className="mt-1.5 text-[13px]">Döner gegessen</div>
          </div>
          <div className="card p-3.5">
            <div className="display truncate text-[40px] font-extrabold leading-none tabular-nums">
              {main ? formatPrice(main.totalCents, main.currency, true) : `${currencySymbol(me.settings.currency)} 0`}
            </div>
            <div className="mt-1.5 text-[13px] text-muted">
              ausgegeben{main ? ` · Ø ${formatPrice(main.avgCents, main.currency)}` : ""}
            </div>
            {others.length > 0 ? (
              <div className="mt-1 text-xs text-muted">+ {others.map((o) => formatPrice(o.totalCents, o.currency, true)).join(", ")}</div>
            ) : null}
          </div>
        </section>

        {stats.count === 0 ? (
          <div className="card flex flex-col items-start gap-3 p-4">
            <p className="m-0 text-[15px] text-muted">{emptyText[period]}</p>
            <Link href="/neu" className="btn btn-primary h-12 w-full text-base">
              Döner eintragen
            </Link>
          </div>
        ) : (
          <>
            <section aria-labelledby="sorten" className="card-flat flex flex-col gap-2.5 rounded-2xl p-3.5">
              <div className="flex items-baseline justify-between">
                <h2 id="sorten" className="display m-0 text-base font-bold">
                  Was du isst
                </h2>
                {stats.avgOverall != null ? <span className="text-[13px] text-muted">Ø {formatRating(stats.avgOverall)} ★</span> : null}
              </div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {stats.byType.map((t, i) => (
                  <li key={t.typeId} className="grid grid-cols-[84px_1fr_28px] items-center gap-2.5">
                    <span className="truncate text-sm font-medium">{t.name}</span>
                    <div className="h-[18px] overflow-hidden rounded-md border-[1.5px] border-ink bg-ground" aria-hidden="true">
                      <div
                        className={`h-full border-r-[1.5px] border-ink ${i === 0 ? "bg-accent" : "bg-mustard"}`}
                        style={{ width: `${Math.round((t.count / maxType) * 100)}%` }}
                      />
                    </div>
                    <span className="text-right text-sm font-bold tabular-nums">
                      {t.count}
                      <span className="sr-only"> Mal</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="beste" className="flex flex-col gap-2.5">
              <h2 id="beste" className="display m-0 text-base font-bold">
                Die Besten je Sorte
              </h2>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {stats.bestByType.map((b) => (
                  <li key={b.typeId}>
                    <Link href={`/eintrag/${b.latestEntryId}`} className="card flex items-center gap-3 p-3 text-ink no-underline hover:text-ink">
                      <span className="chip w-[76px] justify-center truncate text-xs">{b.typeName}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="display truncate text-base font-bold">{b.placeName}</span>
                        <span className="truncate text-xs text-muted">
                          {b.count}× gegessen{b.avgPriceCents != null ? ` · Ø ${formatPrice(b.avgPriceCents, b.currency ?? "EUR")}` : ""}
                        </span>
                      </span>
                      <span className="display flex shrink-0 items-center gap-1 text-lg font-extrabold tabular-nums">
                        <Star size={16} fill="var(--color-mustard)" stroke="var(--color-ink)" strokeWidth={1.8} aria-hidden="true" />
                        {formatRating(b.avgOverall)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
