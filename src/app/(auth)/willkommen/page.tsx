import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { UsernameForm } from "./username-form";

export const metadata: Metadata = { title: "Willkommen" };

export default async function OnboardingPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.username) redirect("/");
  const suggestion = current.name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24);
  return <UsernameForm name={current.name} suggestion={suggestion.length >= 3 ? suggestion : ""} />;
}
