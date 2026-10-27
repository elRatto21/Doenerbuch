import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { getSession } from "@/lib/session";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getSession()) redirect(safeNext(next));
  return <RegisterForm next={safeNext(next)} googleEnabled={googleEnabled} />;
}
