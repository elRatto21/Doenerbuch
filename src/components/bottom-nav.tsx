"use client";

import { BarChart3, BookOpen, MapPin, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Journal", icon: BookOpen },
  { href: "/karte", label: "Karte", icon: MapPin },
  null,
  { href: "/freunde", label: "Freunde", icon: Users },
  { href: "/statistik", label: "Statistik", icon: BarChart3 },
] as const;

const NAV_ROUTES = new Set(["/", "/karte", "/freunde", "/statistik"]);

export function BottomNav({ friendsBadge = 0 }: { friendsBadge?: number }) {
  const pathname = usePathname();
  if (!NAV_ROUTES.has(pathname)) return null;

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-[480px] -translate-x-1/2 grid-cols-5 items-center border-t-2 border-ink bg-surface px-2 pt-1 md:border-x-2"
      style={{ height: "calc(84px + env(safe-area-inset-bottom))", paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
    >
      {TABS.map((tab) => {
        if (!tab) {
          return (
            <Link
              key="new"
              href="/neu"
              aria-label="Neuen Döner eintragen"
              className="-mt-6 flex h-[58px] w-[58px] items-center justify-center justify-self-center rounded-[18px] border-2 border-ink bg-accent text-white shadow-hard hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <Plus size={28} strokeWidth={2.6} aria-hidden="true" />
            </Link>
          );
        }
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center gap-[3px] text-[11px] no-underline ${
              active ? "font-bold text-accent" : "font-medium text-muted"
            }`}
          >
            <span className="relative">
              <Icon size={24} strokeWidth={active ? 2.2 : 2} aria-hidden="true" />
              {tab.href === "/freunde" && friendsBadge > 0 ? (
                <span className="absolute -right-1.5 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-accent" aria-hidden="true" />
              ) : null}
            </span>
            {tab.label}
            {tab.href === "/freunde" && friendsBadge > 0 ? <span className="sr-only">, {friendsBadge} neue Anfragen</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
