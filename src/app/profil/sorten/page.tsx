import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { TypeManager } from "@/components/profile/type-manager";
import { requireUser } from "@/lib/session";
import { listTypes } from "@/server/queries/types";

export const metadata: Metadata = { title: "Eigene Sorten" };

export default async function TypesPage() {
  const me = await requireUser();
  const types = await listTypes(me.id);
  return (
    <main className="pb-10">
      <PageHeader title="Sorten" backHref="/profil" />
      <TypeManager types={types.map((t) => ({ id: t.id, name: t.name, own: t.userId != null }))} />
    </main>
  );
}
