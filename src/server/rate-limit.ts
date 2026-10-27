/**
 * Small in-memory sliding-window rate limiter for server actions and route handlers,
 * keyed per user. Fine for a single app instance (Coolify); with several instances
 * each one counts separately. Entry creation additionally has a DB-backed limit
 * (see assertEntryRate in queries/entries.ts) that survives restarts.
 */

type Rule = { limit: number; windowMs: number };

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const LIMITS = {
  entryEdit: [{ limit: 30, windowMs: MINUTE }],
  entryRate: [{ limit: 20, windowMs: MINUTE }],
  entryDelete: [{ limit: 30, windowMs: MINUTE }],
  placeSuggest: [{ limit: 60, windowMs: MINUTE }],
  upload: [
    { limit: 20, windowMs: MINUTE },
    { limit: 200, windowMs: DAY },
  ],
  friendRequest: [
    { limit: 10, windowMs: MINUTE },
    { limit: 50, windowMs: DAY },
  ],
  friendAnswer: [{ limit: 30, windowMs: MINUTE }],
  userLookup: [
    { limit: 30, windowMs: MINUTE },
    { limit: 500, windowMs: DAY },
  ],
  profile: [{ limit: 10, windowMs: MINUTE }],
  settings: [{ limit: 30, windowMs: MINUTE }],
  kebabType: [{ limit: 10, windowMs: MINUTE }],
  geocode: [
    { limit: 20, windowMs: MINUTE },
    { limit: 500, windowMs: DAY },
  ],
  export: [{ limit: 5, windowMs: MINUTE }],
} satisfies Record<string, Rule[]>;

export type LimitName = keyof typeof LIMITS;

export class RateLimitError extends Error {
  constructor(public retryAfterSec: number) {
    super(`Zu viele Anfragen – bitte warte ${retryAfterSec < 90 ? `${retryAfterSec} Sekunden` : `${Math.ceil(retryAfterSec / 60)} Minuten`}.`);
  }
}

const globalForLimits = globalThis as unknown as { rateLimitHits?: Map<string, number[]> };
const hits = (globalForLimits.rateLimitHits ??= new Map<string, number[]>());
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 10 * MINUTE) return;
  lastSweep = now;
  for (const [key, times] of hits) if (times.length === 0 || now - times[times.length - 1]! > DAY) hits.delete(key);
}

/** Counts one hit for `name` + `subject` (usually the user id). Throws RateLimitError when over a limit. */
export function rateLimit(name: LimitName, subject: string, now = Date.now()) {
  sweep(now);
  const rules: Rule[] = LIMITS[name];
  const key = `${name}:${subject}`;
  const longest = Math.max(...rules.map((r) => r.windowMs));
  const times = (hits.get(key) ?? []).filter((t) => now - t < longest);
  for (const rule of rules) {
    const inWindow = times.filter((t) => now - t < rule.windowMs);
    if (inWindow.length >= rule.limit) {
      hits.set(key, times);
      throw new RateLimitError(Math.max(1, Math.ceil((inWindow[0]! + rule.windowMs - now) / 1000)));
    }
  }
  times.push(now);
  hits.set(key, times);
}

/** For tests. */
export function resetRateLimits() {
  hits.clear();
}
