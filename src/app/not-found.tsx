import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark size={64} />
      <h1 className="display m-0 text-[26px] font-extrabold">Nicht gefunden</h1>
      <p className="m-0 max-w-[300px] text-[15px] text-muted">Diesen Döner gibt&apos;s nicht – oder er ist nicht für dich sichtbar.</p>
      <Link href="/" className="btn btn-primary h-12 px-6 text-base">
        Zum Journal
      </Link>
    </main>
  );
}
