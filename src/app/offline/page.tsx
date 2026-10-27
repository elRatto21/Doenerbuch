import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark size={64} />
      <h1 className="display m-0 text-[26px] font-extrabold">Du bist offline</h1>
      <p className="m-0 max-w-[300px] text-[15px] text-muted">Sobald du wieder Netz hast, geht&apos;s weiter mit deinem Dönerbuch.</p>
    </main>
  );
}
