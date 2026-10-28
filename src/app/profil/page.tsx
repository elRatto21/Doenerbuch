import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { CurrencyRow, SettingsSwitches, SignOutButton } from "@/components/profile/settings";
import { requireUser } from "@/lib/session";
import { fmt } from "@/lib/time";
import { userBadges } from "@/server/badges";
import { listTypes } from "@/server/queries/types";
import { photoUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const me = await requireUser();
  const [badges, types, avatarUrl] = await Promise.all([userBadges(me.id), listTypes(me.id), photoUrl(me.avatarKey)]);
  const earned = badges.filter((b) => b.earnedAt).length;

  return (
    <main className="pb-10">
      <PageHeader title="Profil" backHref="/" />
      <div className="flex flex-col gap-4 px-5 pt-3">
        <section aria-label="Über dich" className="card flex items-center gap-3.5 p-4">
          <Avatar name={me.name} imageUrl={avatarUrl} size={64} highlight className="!border-2 text-2xl" />
          <div className="min-w-0 flex-1">
            <div className="display truncate text-[22px] font-extrabold">{me.username}</div>
            <div className="text-[13px] leading-snug text-muted">
              dabei seit {fmt(me.createdAt, "LLL yyyy")}
            </div>
          </div>
          <Link href="/profil/bearbeiten" className="btn btn-secondary h-11 rounded-[10px] px-3 text-[13px]">
            Bearbeiten
          </Link>
        </section>

        <section aria-labelledby="abz" className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 id="abz" className="display m-0 text-base font-bold">
              Abzeichen
            </h2>
            <span className="text-[13px] text-muted">
              {earned} von {badges.length}
            </span>
          </div>
          <ul className="m-0 grid list-none grid-cols-4 gap-2.5 p-0">
            {badges.map((b) => {
              const got = Boolean(b.earnedAt);
              return (
                <li key={b.key} className="flex flex-col items-center gap-1.5 text-center" title={b.description}>
                  <span
                    aria-hidden="true"
                    className={`display flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border-2 border-ink text-lg font-extrabold ${
                      got ? "bg-mustard text-ink" : "border-dashed bg-ground text-muted"
                    }`}
                  >
                    {b.mark}
                  </span>
                  <span className={`text-[11px] font-bold leading-tight ${got ? "text-ink" : "text-muted"}`}>{b.name}</span>
                  <span className="sr-only">
                    {got ? `erreicht am ${fmt(b.earnedAt!, "dd.MM.yyyy")}` : "noch nicht erreicht"}: {b.description}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="einst" className="flex flex-col gap-2.5">
          <h2 id="einst" className="display m-0 text-base font-bold">
            Einstellungen
          </h2>
          <ul className="card-flat m-0 flex list-none flex-col overflow-hidden rounded-2xl p-0">
            <SettingsSwitches settings={me.settings} />
            <CurrencyRow currency={me.settings.currency} />
            <li className="border-t-2 border-hairline">
              <Link href="/profil/sorten" className="flex min-h-14 items-center gap-3 px-3.5 text-ink no-underline">
                <span className="flex-1 text-[15px] font-medium">Eigene Sorten</span>
                <span className="text-sm text-muted">{types.length}</span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </li>
            <li className="border-t-2 border-hairline">
              <a href="/api/export" download className="flex min-h-14 items-center gap-3 px-3.5 text-ink no-underline">
                <span className="flex-1 text-[15px] font-medium">Daten exportieren</span>
                <span className="text-sm text-muted">CSV</span>
                <ChevronRight size={18} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </section>

        <SignOutButton />
      </div>
    </main>
  );
}
