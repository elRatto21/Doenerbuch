"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, FormError, FormField } from "@/components/auth/auth-shell";
import { authClient } from "@/lib/auth-client";
import { USERNAME_PATTERN } from "@/lib/validation";

type Errors = Partial<Record<"name" | "username" | "email" | "password", string>>;

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function checkUsername(value: string) {
    const username = value.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) return;
    const { data } = await authClient.isUsernameAvailable({ username });
    setErrors((e) => ({ ...e, username: data && !data.available ? "Dieser Username ist schon vergeben." : undefined }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const problems: Errors = {};
    if (!name) problems.name = "Wie heißt du?";
    if (!USERNAME_PATTERN.test(username)) problems.username = "3–24 Zeichen: a–z, 0–9, Punkt oder Unterstrich.";
    if (!/^\S+@\S+\.\S+$/.test(email)) problems.email = "Bitte gib eine gültige E-Mail ein.";
    if (password.length < 8) problems.password = "Mindestens 8 Zeichen.";
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setPending(true);
    setFormError(null);
    const result = await authClient.signUp.email({ name, email, password, username, displayUsername: username });
    if (result.error) {
      setPending(false);
      const code = result.error.code ?? "";
      if (code.includes("USERNAME")) setErrors({ username: "Dieser Username ist schon vergeben." });
      else if (code.includes("USER_ALREADY_EXISTS") || code.includes("EMAIL")) setErrors({ email: "Für diese E-Mail gibt es schon ein Konto." });
      else setFormError("Registrierung fehlgeschlagen. Bitte versuch es nochmal.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <AuthShell title="Konto erstellen" subtitle="Ab jetzt zählt jeder Döner." backHref={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5" noValidate>
        <FormField id="name" label="Name" autoComplete="name" error={errors.name} required />
        <FormField
          id="username"
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          hint="So finden dich deine Freunde: @username"
          error={errors.username}
          onBlur={(e) => void checkUsername(e.currentTarget.value)}
          required
        />
        <FormField id="email" label="E-Mail" type="email" autoComplete="email" error={errors.email} required />
        <FormField id="password" label="Passwort" type="password" autoComplete="new-password" hint="Mindestens 8 Zeichen" error={errors.password} required />
        <FormError message={formError} />
        <button type="submit" className="btn btn-primary mt-1 w-full" disabled={pending} aria-busy={pending}>
          {pending ? "Konto wird erstellt …" : "Registrieren"}
        </button>
      </form>
      <p className="m-0 text-center text-sm text-muted">
        Schon dabei?{" "}
        <Link href={next === "/" ? "/anmelden" : `/anmelden?next=${encodeURIComponent(next)}`} className="font-bold text-ink">
          Anmelden
        </Link>
      </p>
    </AuthShell>
  );
}
