import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthStart } from "@/components/auth/auth-start";
import { googleEnabled } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Willkommen" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSession()) redirect(safeNext(next));
  return <AuthStart next={safeNext(next)} googleEnabled={googleEnabled} />;
}
