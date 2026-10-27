import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/session";
import { photoUrl, storageEnabled } from "@/server/storage";

export const metadata: Metadata = { title: "Profil bearbeiten" };

export default async function EditProfilePage() {
  const me = await requireUser();
  return (
    <main className="pb-10">
      <PageHeader title="Bearbeiten" backHref="/profil" />
      <ProfileForm name={me.name} username={me.username ?? ""} avatarUrl={await photoUrl(me.avatarKey)} photosEnabled={storageEnabled} />
    </main>
  );
}
