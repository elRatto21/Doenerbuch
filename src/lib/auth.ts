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
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  socialProviders: googleEnabled
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
    : {},
  session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24 },
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
        after: async (created) => {
          await assignFriendCode(created.id);
        },
      },
    },
  },
});
