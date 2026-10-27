"use client";

import Link from "next/link";
import { useState } from "react";
import { KebabIcon } from "@/components/logo";
import { authClient } from "@/lib/auth-client";
import { GoogleButton } from "./auth-shell";

/** Entry point for signed-out visitors: two clear choices, nothing else. */
export function AuthStart({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [pending, setPending] = useState(false);
  const query = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

  return (
    <main className="flex min-h-dvh flex-col px-5 pb-[calc(32px+env(safe-area-inset-bottom))] pt-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div aria-hidden="true" className="flex h-[132px] w-[132px] items-center justify-center rounded-full border-2 border-ink bg-mustard shadow-hard-lg">
          <KebabIcon size={72} color="var(--color-ink)" strokeWidth={1.8} />
        </div>
        <h1 className="display m-0 mt-7 text-[40px] font-extrabold leading-none tracking-[-1px]">Dönerbuch</h1>
        <p className="m-0 mt-3 max-w-[300px] text-[16px] leading-snug text-muted">Jeder Döner zählt. Eintragen, bewerten und mit Freunden vergleichen.</p>
      </div>

      <div className="flex flex-col gap-3">
        <Link href={`/registrieren${query}`} className="btn btn-primary w-full">
          Neues Konto erstellen
        </Link>
        <Link href={`/anmelden${query}`} className="btn btn-secondary h-14 w-full rounded-[14px] text-[17px] shadow-hard">
          Ich habe schon ein Konto
        </Link>
        {googleEnabled ? (
          <GoogleButton
            disabled={pending}
            onClick={() => {
              setPending(true);
              void authClient.signIn.social({ provider: "google", callbackURL: next, newUserCallbackURL: "/willkommen" });
            }}
          />
        ) : null}
      </div>
    </main>
  );
}
