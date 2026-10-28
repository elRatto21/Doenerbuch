"use client";

import { Award, Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Confirmation after saving; strips the query so a reload doesn't repeat it. */
export function SavedNotice({ kind, open, badges }: { kind: "new" | "edited" | "rated"; open: boolean; badges: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const t = setTimeout(() => router.replace(pathname, { scroll: false }), 6000);
    return () => clearTimeout(t);
  }, [router, pathname]);
  return (
    <div role="status" className="flex flex-col gap-1.5 rounded-xl border-2 border-ink bg-mustard px-3 py-2.5 text-sm font-bold shadow-hard-sm">
      <span className="flex items-center gap-2">
        <Check size={18} strokeWidth={2.6} aria-hidden="true" />
        {kind === "new" ? "Ins Dönerbuch eingetragen!" : kind === "rated" ? "Bewertung gespeichert!" : "Änderungen gespeichert."}
      </span>
      {kind === "new" && open ? <span className="font-medium">Bewerte ihn, wenn du fertig gegessen hast – er bleibt bis dahin offen.</span> : null}
      {badges.map((b) => (
        <span key={b} className="flex items-center gap-2 font-medium">
          <Award size={18} aria-hidden="true" /> Neues Abzeichen: <strong>{b}</strong>
        </span>
      ))}
    </div>
  );
}
