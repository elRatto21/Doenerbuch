import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Current user row incl. app fields, or null. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const row = await db.query.user.findFirst({ where: eq(user.id, session.user.id) });
  return row ?? null;
});

/** For pages and actions: redirects to /login (or onboarding) when needed. */
export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (!current.username) redirect("/willkommen");
  return current;
}

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
