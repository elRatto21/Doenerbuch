import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { RelationButton } from "@/components/friends/relation-button";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import { entryCount } from "@/server/queries/entries";
import { findUserByFriendCode, relationTo } from "@/server/queries/friends";
import { photoUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Einladung" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const me = await requireUser();
  const { code } = await params;
  const other = await findUserByFriendCode(decodeURIComponent(code));
  if (other?.id === me.id) redirect("/freunde/hinzufuegen");

  return (
    <main>
      <PageHeader title="Einladung" backHref="/freunde" />
      <div className="px-5 pt-3">
        {!other ? (
          <section className="card flex flex-col gap-3 p-4">
            <h2 className="display m-0 text-xl font-extrabold">Code nicht gefunden</h2>
            <p className="m-0 text-[15px] text-muted">Prüf den Code nochmal – er sieht aus wie DÖN-4K7Q.</p>
            <Link href="/freunde/hinzufuegen" className="btn btn-primary h-12 text-base">
              Code eingeben
            </Link>
          </section>
        ) : (
          <section className="card flex flex-col items-center gap-3 rounded-[20px] p-6 text-center shadow-hard-lg">
            <Avatar name={other.name} imageUrl={await photoUrl(other.avatarKey)} size={88} highlight className="!border-2 text-3xl" />
            <div>
              <h2 className="display m-0 text-2xl font-extrabold">{other.name}</h2>
              <p className="m-0 mt-1 text-sm text-muted">
                @{other.username} · {await entryCount(other.id)} Döner
              </p>
            </div>
            <p className="m-0 text-[15px] text-muted">möchte mit dir im Dönerbuch vergleichen.</p>
            <RelationButton userId={other.id} relation={await relationTo(me.id, other.id)} />
          </section>
        )}
      </div>
    </main>
  );
}
