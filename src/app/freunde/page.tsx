import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { formatPrice, formatRating, firstName } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { fmt, relativeTime } from "@/lib/time";
import { listFriends, pendingIncomingCount } from "@/server/queries/friends";
import { friendFeed, monthlyRanking } from "@/server/queries/social";
import { photoUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Freunde" };

const FEED_PAGE = 20;

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ seiten?: string }> }) {
  const me = await requireUser();
  const pages = Math.min(Math.max(Number((await searchParams).seiten) || 1, 1), 20);
  const [friends, ranking, feed, pending] = await Promise.all([
    listFriends(me.id),
    monthlyRanking(me.id),
    friendFeed(me.id, { limit: FEED_PAGE * pages }),
    pendingIncomingCount(me.id),
  ]);
  const avatars = new Map<string, string | null>();
  await Promise.all(
    [...ranking.map((r) => [r.userId, r.avatarKey] as const), ...feed.items.map((f) => [f.userId, f.avatarKey] as const)].map(async ([id, key]) => {
      if (!avatars.has(id)) avatars.set(id, await photoUrl(key));
    }),
  );

  return (
    <main className="pb-nav">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <h1 className="display m-0 text-[26px] font-extrabold tracking-[-0.5px]">Freunde</h1>
        <Link href="/freunde/hinzufuegen" className="btn btn-mustard relative h-11 rounded-xl px-3.5 text-sm shadow-hard-sm">
          <UserPlus size={18} strokeWidth={2.2} aria-hidden="true" />
          Hinzufügen
          {pending > 0 ? (
            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-ink bg-accent px-1 text-xs font-bold text-white">
              {pending}
              <span className="sr-only"> offene Anfragen</span>
            </span>
          ) : null}
        </Link>
      </header>

      {friends.length === 0 ? (
        <section className="card mx-5 flex flex-col gap-3 p-4">
          <h2 className="display m-0 text-lg font-bold">Noch keine Freunde</h2>
          <p className="m-0 text-[15px] text-muted">Teil deinen Freundescode, dann könnt ihr euch in der Rangliste messen und seht, wo die anderen essen.</p>
          <Link href="/freunde/hinzufuegen" className="btn btn-primary h-12 text-base">
            Freunde einladen
          </Link>
        </section>
      ) : (
        <>
          <section aria-labelledby="rang" className="card mx-5 p-3.5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 id="rang" className="display m-0 text-base font-bold">
                Rangliste {fmt(new Date(), "LLLL")}
              </h2>
              <span className="text-xs text-muted">nach Anzahl Döner</span>
            </div>
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {ranking.map((r) => (
                <li
                  key={r.userId}
                  aria-current={r.isMe ? "true" : undefined}
                  className={`flex items-center gap-2.5 rounded-[10px] border-[1.5px] px-2 py-1.5 ${r.isMe ? "border-ink bg-accent-soft" : "border-transparent"}`}
                >
                  <span className="display w-5 text-center text-base font-extrabold tabular-nums">{r.rank}</span>
                  <Avatar name={r.name} imageUrl={avatars.get(r.userId)} size={32} highlight={r.rank === 1} />
                  <span className={`flex-1 truncate text-[15px] ${r.isMe ? "font-bold" : "font-medium"}`}>{r.isMe ? "Du" : firstName(r.name)}</span>
                  <span className="text-[13px] text-muted tabular-nums">{r.avgOverall != null ? `Ø ${formatRating(r.avgOverall)} ★` : "–"}</span>
                  <span className="display w-8 text-right text-lg font-extrabold tabular-nums">{r.count}</span>
                </li>
              ))}
            </ol>
          </section>

          <h2 className="display mx-5 mb-2.5 mt-5 text-base font-bold">Was deine Freunde essen</h2>
          {feed.items.length === 0 ? (
            <p className="mx-5 my-0 text-[15px] text-muted">Deine Freunde haben noch nichts eingetragen.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2.5 px-5 py-0">
              {feed.items.map((f) => (
                <li key={f.id}>
                  <Link href={`/eintrag/${f.id}`} className="card-flat flex items-start gap-3 p-3 text-ink no-underline hover:text-ink">
                    <Avatar name={f.userName} imageUrl={avatars.get(f.userId)} size={40} highlight={f.withMe} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="text-[15px] leading-snug">
                        <strong>{firstName(f.userName)}</strong> war bei <strong>{f.placeName}</strong>
                        {f.withMe ? " mit dir" : f.newSpot ? " – neuer Spot!" : ""}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                        <span className="chip">{f.typeName}</span>
                        <span className="font-bold text-ink">{formatRating(f.overall)} ★</span>
                        {f.priceCents != null ? <span>{formatPrice(f.priceCents, f.currency)}</span> : null}
                        <span>· {relativeTime(f.eatenAt)}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {feed.hasMore ? (
            <div className="mt-3 px-5">
              <Link href={`/freunde?seiten=${pages + 1}`} scroll={false} className="btn btn-secondary h-12 w-full">
                Mehr anzeigen
              </Link>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
