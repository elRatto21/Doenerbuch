import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";

// No 0/O/1/I to keep codes readable.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const FRIEND_CODE_PREFIX = "DÖN-";

export function randomFriendCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return FRIEND_CODE_PREFIX + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Accepts "DÖN-4K7Q", "don4k7q", "4k7q" … and returns "DÖN-4K7Q", or null. */
export function normalizeFriendCode(input: string): string | null {
  const compact = input
    .toUpperCase()
    .replace(/Ö/g, "O")
    .replace(/[^A-Z0-9]/g, "");
  const suffix = compact.startsWith("DON") ? compact.slice(3) : compact;
  if (suffix.length !== 4) return null;
  if ([...suffix].some((c) => !ALPHABET.includes(c))) return null;
  return FRIEND_CODE_PREFIX + suffix;
}

export function friendCodeSuffix(code: string): string {
  return code.slice(FRIEND_CODE_PREFIX.length);
}

export async function assignFriendCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomFriendCode();
    try {
      const rows = await db
        .update(user)
        .set({ friendCode: code })
        .where(and(eq(user.id, userId), isNull(user.friendCode)))
        .returning({ friendCode: user.friendCode });
      if (rows.length > 0) return code;
      const existing = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { friendCode: true } });
      if (existing?.friendCode) return existing.friendCode;
      throw new Error(`User ${userId} not found`);
    } catch (err) {
      // unique violation → try another code
      if ((err as { code?: string }).code === "23505") continue;
      throw err;
    }
  }
  throw new Error("Could not allocate a friend code");
}
