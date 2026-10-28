"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { addKebabType, archiveKebabType } from "@/server/actions/profile";

export function TypeManager({ types }: { types: { id: number; name: string; own: boolean }[] }) {
  const [state, action, pending] = useActionState(addKebabType, null);
  const [removing, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-4 px-5 pt-3">
      <p className="m-0 text-[15px] text-muted">Die Standard-Sorten gibt es für alle. Eigene Sorten siehst nur du – deine Freunde sehen sie in deinen Einträgen.</p>
      <ul className="card-flat m-0 flex list-none flex-col overflow-hidden rounded-2xl p-0">
        {types.map((t, i) => (
          <li key={t.id} className={`flex min-h-13 items-center gap-3 px-3.5 py-2 ${i > 0 ? "border-t-2 border-hairline" : ""}`}>
            <span className="flex-1 text-[15px] font-medium">{t.name}</span>
            {t.own ? (
              <button
                type="button"
                aria-label={`${t.name} entfernen`}
                disabled={removing}
                onClick={() => startTransition(() => archiveKebabType(t.id))}
                className="icon-btn h-10 w-10 border-0 text-accent"
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            ) : (
              <span className="text-xs text-muted">Standard</span>
            )}
          </li>
        ))}
      </ul>
      <form ref={form} action={action} className="flex flex-col gap-1.5">
        <label htmlFor="name" className="display text-base font-bold">
          Neue Sorte
        </label>
        <div className="flex gap-2">
          <input id="name" name="name" maxLength={30} placeholder="z. B. Iskender" className="field" required aria-invalid={state?.fieldErrors?.name ? true : undefined} />
          <button type="submit" aria-label="Sorte hinzufügen" disabled={pending} className="icon-btn h-12 w-12 bg-mustard">
            <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>
        {state?.fieldErrors?.name ? <span className="text-[13px] font-medium text-accent">{state.fieldErrors.name}</span> : null}
      </form>
    </div>
  );
}
