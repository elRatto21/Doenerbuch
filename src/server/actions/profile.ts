"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { kebabType, user, type UserSettings } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/session";
import { currencySchema, usernameSchema } from "@/lib/validation";
import { deleteObject } from "@/server/storage";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | null;

async function usernameTaken(username: string, exceptUserId: string) {
  const hit = await db.query.user.findFirst({
    where: and(eq(user.username, username), ne(user.id, exceptUserId)),
    columns: { id: true },
  });
  return Boolean(hit);
}

/** Onboarding for social sign-ups: pick a username once. */
export async function chooseUsername(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) return { fieldErrors: { username: parsed.error.issues[0]!.message } };
  if (await usernameTaken(parsed.data, current.id)) return { fieldErrors: { username: "Dieser Username ist schon vergeben." } };
  await db.update(user).set({ username: parsed.data, displayUsername: parsed.data, updatedAt: new Date() }).where(eq(user.id, current.id));
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt").max(60),
  username: usernameSchema,
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = await requireUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name"), username: formData.get("username") });
  if (!parsed.success) {
    return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  if (await usernameTaken(parsed.data.username, current.id)) return { fieldErrors: { username: "Dieser Username ist schon vergeben." } };
  await db
    .update(user)
    .set({ name: parsed.data.name, username: parsed.data.username, displayUsername: parsed.data.username, updatedAt: new Date() })
    .where(eq(user.id, current.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAvatar(key: string | null) {
  const current = await requireUser();
  if (key !== null && !key.startsWith(`avatars/${current.id}/`)) throw new Error("Ungültiger Upload");
  const previous = current.avatarKey;
  await db.update(user).set({ avatarKey: key, updatedAt: new Date() }).where(eq(user.id, current.id));
  if (previous && previous !== key) await deleteObject(previous).catch(() => undefined);
  revalidatePath("/", "layout");
}

const settingsPatchSchema = z
  .object({
    autoGps: z.boolean(),
    visibleToFriends: z.boolean(),
    notifications: z.boolean(),
    currency: currencySchema,
  })
  .partial();

export async function updateSettings(patch: Partial<UserSettings>) {
  const current = await requireUser();
  const parsed = settingsPatchSchema.parse(patch);
  const settings: UserSettings = { ...current.settings, ...parsed };
  await db.update(user).set({ settings, updatedAt: new Date() }).where(eq(user.id, current.id));
  revalidatePath("/", "layout");
  return settings;
}

// --- own kebab types --------------------------------------------------------

const typeNameSchema = z.string().trim().min(1, "Name fehlt").max(30, "Höchstens 30 Zeichen");

export async function addKebabType(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = await requireUser();
  const parsed = typeNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { fieldErrors: { name: parsed.error.issues[0]!.message } };
  const visible = await db.query.kebabType.findMany({ where: (t, { or, isNull }) => or(isNull(t.userId), eq(t.userId, current.id)) });
  const existing = visible.find((t) => t.name.toLowerCase() === parsed.data.toLowerCase());
  if (existing && !existing.archived) return { fieldErrors: { name: "Diese Sorte gibt es schon." } };
  if (existing && existing.userId === current.id) {
    await db.update(kebabType).set({ archived: false }).where(eq(kebabType.id, existing.id));
  } else {
    await db.insert(kebabType).values({ userId: current.id, name: parsed.data, sort: 100 });
  }
  revalidatePath("/profil/sorten");
  return { ok: true };
}

/** Own types are archived, not deleted, so existing entries keep their type. */
export async function archiveKebabType(id: number) {
  const current = await requireUser();
  await db
    .update(kebabType)
    .set({ archived: true })
    .where(and(eq(kebabType.id, id), eq(kebabType.userId, current.id)));
  revalidatePath("/profil/sorten");
}
