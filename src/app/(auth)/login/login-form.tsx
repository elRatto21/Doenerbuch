"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, Divider, FormError, FormField, GoogleButton } from "@/components/auth/auth-shell";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const login = String(form.get("login") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setPending(true);
    setError(null);
    const result = login.includes("@")
      ? await authClient.signIn.email({ email: login, password })
      : await authClient.signIn.username({ username: login.toLowerCase(), password });
    if (result.error) {
      setPending(false);
      setError("E-Mail/Username oder Passwort stimmt nicht.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <AuthShell title="Willkommen zurück" subtitle="Melde dich an, um dein Dönerbuch zu öffnen.">
      {googleEnabled ? (
        <>
          <GoogleButton
            disabled={pending}
            onClick={() => {
              setPending(true);
              void authClient.signIn.social({ provider: "google", callbackURL: next });
            }}
          />
          <Divider />
        </>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
        <FormField id="login" label="E-Mail oder Username" autoComplete="username" autoCapitalize="none" required />
        <FormField id="password" label="Passwort" type="password" autoComplete="current-password" required />
        <FormError message={error} />
        <button type="submit" className="btn btn-primary mt-1 w-full" disabled={pending} aria-busy={pending}>
          {pending ? "Anmelden …" : "Anmelden"}
        </button>
      </form>
      <p className="m-0 text-center text-sm text-muted">
        Noch kein Konto?{" "}
        <Link href={next === "/" ? "/registrieren" : `/registrieren?next=${encodeURIComponent(next)}`} className="font-bold text-ink">
          Registrieren
        </Link>
      </p>
    </AuthShell>
  );
}
