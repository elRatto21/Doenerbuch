"use client";

import { ChevronRight, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Switch } from "@/components/switch";
import type { UserSettings } from "@/db/schema";
import { authClient } from "@/lib/auth-client";
import { CURRENCY_NAME, currencySymbol } from "@/lib/format";
import { CURRENCIES } from "@/lib/validation";
import { updateSettings } from "@/server/actions/profile";

const SWITCHES: { key: "autoGps" | "visibleToFriends" | "notifications"; label: string; hint: string }[] = [
  { key: "autoGps", label: "Standort automatisch erfassen", hint: "Beim neuen Eintrag per GPS" },
  { key: "visibleToFriends", label: "Für Freunde sichtbar", hint: "Einträge erscheinen im Freunde-Feed" },
  { key: "notifications", label: "Benachrichtigungen", hint: "Hinweis auf neue Anfragen im Freunde-Tab" },
];

export function SettingsSwitches({ settings }: { settings: UserSettings }) {
  const [state, setState] = useState(settings);
  const [, startTransition] = useTransition();

  function toggle(key: (typeof SWITCHES)[number]["key"], value: boolean) {
    const previous = state;
    setState({ ...state, [key]: value });
    startTransition(async () => {
      try {
        setState(await updateSettings({ [key]: value }));
      } catch {
        setState(previous);
      }
    });
  }

  return (
    <>
      {SWITCHES.map((s, i) => (
        <li key={s.key} className={`flex min-h-16 items-center gap-3 px-3.5 py-2.5 ${i > 0 ? "border-t-2 border-hairline" : ""}`}>
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-medium">{s.label}</span>
            <span className="text-xs text-muted">{s.hint}</span>
          </span>
          <Switch checked={state[s.key]} label={s.label} onChange={(v) => toggle(s.key, v)} />
        </li>
      ))}
    </>
  );
}

export function CurrencyRow({ currency }: { currency: string }) {
  const [value, setValue] = useState(currency);
  const [pending, startTransition] = useTransition();
  return (
    <li className="relative border-t-2 border-hairline">
      <label htmlFor="waehrung" className="flex min-h-14 cursor-pointer items-center gap-3 px-3.5">
        <span className="flex-1 text-[15px] font-medium">Währung</span>
        <span className="text-sm text-muted">
          {currencySymbol(value)} {CURRENCY_NAME[value] ?? value}
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </label>
      <select
        id="waehrung"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          startTransition(async () => {
            await updateSettings({ currency: next as UserSettings["currency"] });
          });
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {currencySymbol(c)} {CURRENCY_NAME[c]}
          </option>
        ))}
      </select>
    </li>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
      className="btn btn-secondary h-12 w-full rounded-[14px] text-[15px] text-accent hover:text-accent"
    >
      <LogOut size={18} aria-hidden="true" />
      {pending ? "Abmelden …" : "Abmelden"}
    </button>
  );
}
