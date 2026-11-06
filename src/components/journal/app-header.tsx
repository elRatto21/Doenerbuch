import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { LogoMark } from "@/components/logo";

export function AppHeader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <header className="flex items-center justify-between px-5 pb-3 pt-5">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <h1 className="display m-0 text-[26px] font-extrabold tracking-[-0.5px]">Dönerbuch</h1>
      </div>
      <Link href="/profil" aria-label="Profil" className="rounded-full">
        <Avatar name={name} imageUrl={avatarUrl} size={44} highlight className="!border-2 text-base" />
      </Link>
    </header>
  );
}
