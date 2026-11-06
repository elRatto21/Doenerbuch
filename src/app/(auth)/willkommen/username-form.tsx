"use client";

import { useActionState } from "react";
import { AuthShell, FormField } from "@/components/auth/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { chooseUsername } from "@/server/actions/profile";

export function UsernameForm({ name, suggestion }: { name: string; suggestion: string }) {
  const [state, action] = useActionState(chooseUsername, null);
  return (
    <AuthShell title={`Hallo ${name.split(" ")[0]}!`} subtitle="Wähl noch einen Username – so finden dich deine Freunde.">
      <form action={action} className="flex flex-col gap-3.5">
        <FormField
          id="username"
          label="Username"
          defaultValue={suggestion}
          autoCapitalize="none"
          spellCheck={false}
          hint="3–24 Zeichen: a–z, 0–9, Punkt oder Unterstrich"
          error={state?.fieldErrors?.username}
          required
        />
        <SubmitButton pendingLabel="Speichern …">Los geht&apos;s</SubmitButton>
      </form>
    </AuthShell>
  );
}
