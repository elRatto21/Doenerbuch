import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { assignFriendCode } from "@/server/friend-code";
import { USERNAME_PATTERN } from "@/lib/validation";

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// `next build` imports this module while collecting page data; the build must not need
// runtime secrets (e.g. on Coolify/Nixpacks). At runtime a missing secret still fails.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET || (isBuild ? "build-time-placeholder-secret-not-used-at-runtime" : undefined),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // The app changes profile data only through its own server actions. Better Auth's generic
  // update endpoint would let a client set any `name`/`image` (hooks can't remove fields), so it's off.
  disabledPaths: ["/update-user"],
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: true },
  socialProviders: googleEnabled
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
    : {},
  session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24 },
  // Brute-force protection for the auth endpoints (per client IP, in memory – one app instance).
  rateLimit: {
    enabled: process.env.NODE_ENV === "production" || process.env.AUTH_RATE_LIMIT === "true",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-in/username": { window: 60, max: 5 },
      "/sign-in/social": { window: 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/is-username-available": { window: 60, max: 30 },
    },
  },
  advanced: {
    ipAddress: {
      // Coolify/Traefik sets X-Forwarded-For. Behind Cloudflare use TRUSTED_IP_HEADER=cf-connecting-ip
      // (only if the origin is reachable through Cloudflare alone – the header can be spoofed otherwise).
      ipAddressHeaders: [process.env.TRUSTED_IP_HEADER || "x-forwarded-for"],
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 24,
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
    }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        // The app shows `name` as the username. Clients can call the auth API directly, so never
        // trust a client-chosen name: it mirrors the username (social sign-ups pick one in /willkommen).
        before: async (data) => ({
          data: { ...data, name: typeof data.username === "string" && data.username ? data.username : String(data.name ?? "").slice(0, 60), image: null },
        }),
        after: async (created) => {
          await assignFriendCode(created.id);
        },
      },
    },
  },
});
