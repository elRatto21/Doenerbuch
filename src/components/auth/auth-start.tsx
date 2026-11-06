"use client";

import Link from "next/link";
import { useState } from "react";
import { KebabIcon } from "@/components/logo";
import { authClient } from "@/lib/auth-client";
import { Divider, GoogleButton } from "./auth-shell";

// never below 46px so the buttons stay easy to tap
const BUTTON_HEIGHT = "h-[clamp(46px,7.5dvh,56px)]";

/** Entry point for signed-out visitors: two clear choices, nothing else. */
export function AuthStart({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [pending, setPending] = useState(false);
  const query = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

  return (
    // Sizes follow the visible height (dvh) within fixed bounds, so the page fits
    // without scrolling from an iPhone SE in Safari up to large phones.
    <main className="flex min-h-dvh flex-col px-5 pb-[calc(clamp(16px,4dvh,32px)+env(safe-area-inset-bottom))] pt-[clamp(16px,5dvh,40px)]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          aria-hidden="true"
          className="flex size-[clamp(72px,18dvh,132px)] items-center justify-center rounded-full border-2 border-ink bg-mustard shadow-hard-lg [&>svg]:size-[55%]"
        >
          <KebabIcon size={72} color="var(--color-ink)" strokeWidth={1.8} />
        </div>
        <h1 className="display m-0 mt-[clamp(12px,3.5dvh,28px)] text-[clamp(30px,6dvh,40px)] font-extrabold leading-none tracking-[-1px]">Dönerbuch</h1>
        <p className="m-0 mt-[clamp(6px,1.5dvh,12px)] max-w-[300px] text-[clamp(14px,2.2dvh,16px)] leading-snug text-muted">Jeder Döner zählt. Eintragen, bewerten und mit Freunden vergleichen.</p>
      </div>

      <div className="mt-[clamp(12px,3dvh,24px)] flex flex-col gap-[clamp(8px,1.5dvh,12px)]">
        <Link href={`/anmelden${query}`} className={`btn btn-primary w-full ${BUTTON_HEIGHT}`}>
          Anmelden
        </Link>
        <Link href={`/registrieren${query}`} className={`btn btn-secondary w-full rounded-[14px] text-[17px] shadow-hard ${BUTTON_HEIGHT}`}>
          Registrieren
        </Link>
        {googleEnabled ? (
          <>
            <Divider />
            <GoogleButton
              className={BUTTON_HEIGHT}
              disabled={pending}
              onClick={() => {
                setPending(true);
                void authClient.signIn.social({ provider: "google", callbackURL: next, newUserCallbackURL: "/willkommen" });
              }}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
