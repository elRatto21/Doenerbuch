import { Search } from "lucide-react";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { Avatar } from "@/components/avatar";
import { InviteActions } from "@/components/friends/invite-actions";
import { RelationButton, RequestButtons } from "@/components/friends/relation-button";
import { PageHeader } from "@/components/page-header";
import { appUrl } from "@/lib/app-url";
import { requireUser } from "@/lib/session";
import { friendCodeSuffix } from "@/server/friend-code";
import { incomingRequests, searchUsers } from "@/server/queries/friends";
import { photoUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Freund hinzufügen" };

export default async function AddFriendPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireUser();
  const q = ((await searchParams).q ?? "").slice(0, 60);
  const code = me.friendCode ?? "";
  const link = `${await appUrl()}/freunde/einladung/${encodeURIComponent(friendCodeSuffix(code))}`;
  const [qrSvg, results, requests] = await Promise.all([
    QRCode.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1B1A17", light: "#FFFFFF" } }),
    q ? searchUsers(me.id, q) : Promise.resolve([]),
    incomingRequests(me.id),
  ]);
  const avatarUrls = new Map(
    await Promise.all([...results, ...requests].map(async (u) => [u.id, await photoUrl(u.avatarKey)] as const)),
  );

  return (
    <main className="pb-10">
      <PageHeader title="Freund hinzufügen" backHref="/freunde" />
      <div className="flex flex-col gap-4 px-5 pt-3">
        <section aria-labelledby="meincode" className="card flex items-center gap-4 rounded-[18px] p-4">
          <div
            role="img"
            aria-label="QR-Code mit deinem Einladungslink"
            className="h-[112px] w-[112px] shrink-0 rounded-xl border-2 border-ink bg-surface p-2 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="meincode" className="m-0 text-[13px] font-bold text-muted">
              Dein Freundescode
            </h2>
            <div className="display text-[28px] font-extrabold tracking-[1px] tabular-nums">{code}</div>
            <span className="text-[13px] leading-snug text-muted">Lass den QR-Code scannen oder schick den Link.</span>
          </div>
        </section>

        <InviteActions link={link} code={code} />

        <form method="get" className="flex flex-col gap-2" role="search">
          <label htmlFor="code" className="display text-base font-bold">
            Code oder Name eingeben
          </label>
          <div className="flex gap-2">
            <input id="code" name="q" type="search" defaultValue={q} placeholder="z. B. DÖN-4K7Q oder @tim" autoCapitalize="none" className="field" />
            <button type="submit" aria-label="Suchen" className="icon-btn h-12 w-12 bg-mustard">
              <Search size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        </form>

        {q ? (
          results.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">Niemanden gefunden für „{q}“.</p>
          ) : (
            <ul aria-label="Suchergebnisse" className="card-flat m-0 flex list-none flex-col p-0">
              {results.map((r, i) => (
                <li key={r.id} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t-2 border-hairline" : ""}`}>
                  <Avatar name={r.name} imageUrl={avatarUrls.get(r.id)} size={40} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-bold">{r.username}</span>
                    <span className="truncate text-xs text-muted">
                      {r.relation === "friends" ? "bereits befreundet" : `${r.entryCount} Döner`}
                    </span>
                  </span>
                  <RelationButton userId={r.id} relation={r.relation} />
                </li>
              ))}
            </ul>
          )
        ) : null}

        <section aria-labelledby="anfragen" className="flex flex-col gap-2">
          <h2 id="anfragen" className="display m-0 text-base font-bold">
            Anfragen an dich
          </h2>
          {requests.length === 0 ? (
            <p className="m-0 text-sm text-muted">Gerade keine offenen Anfragen.</p>
          ) : (
            requests.map((r) => (
              <div key={r.requestId} className="card flex items-center gap-3 p-3">
                <Avatar name={r.name} imageUrl={avatarUrls.get(r.id)} size={40} highlight />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-bold">{r.name}</span>
                  <span className="truncate text-xs text-muted">
                    {r.entryCount} Döner
                    {r.mutualCount > 0 ? ` · ${r.mutualCount} gemeinsame${r.mutualCount === 1 ? "r Freund" : " Freunde"}` : ""}
                  </span>
                </span>
                <RequestButtons requestId={r.requestId} name={r.name} />
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
