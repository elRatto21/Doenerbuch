import { relations, sql } from "drizzle-orm";
import {
  boolean,
  char,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type UserSettings = {
  autoGps: boolean;
  visibleToFriends: boolean;
  notifications: boolean;
  currency: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  autoGps: true,
  visibleToFriends: true,
  notifications: true,
  currency: "EUR",
};

// ---------------------------------------------------------------------------
// Better Auth tables (user extended with app fields)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // username plugin
  username: text("username").unique(),
  displayUsername: text("display_username"),
  // app fields
  friendCode: text("friend_code").unique(),
  avatarKey: text("avatar_key"),
  settings: jsonb("settings").$type<UserSettings>().notNull().default(DEFAULT_SETTINGS),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------

export const meatEnum = pgEnum("meat", ["kalb", "haehnchen", "hack", "steak", "veggie", "unbekannt"]);
export const friendshipStatusEnum = pgEnum("friendship_status", ["pending", "accepted", "declined"]);

/** userId null = standard type available to everyone. */
export const kebabType = pgTable(
  "kebab_type",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(100),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [index("kebab_type_user_idx").on(t.userId)],
);

export const place = pgTable(
  "place",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** Lowercased, accent-free, alphanumeric-only name for dedupe. */
    nameNormalized: text("name_normalized").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    address: text("address"),
    city: text("city"),
    osmId: text("osm_id"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("place_lat_lng_idx").on(t.lat, t.lng), index("place_name_norm_idx").on(t.nameNormalized)],
);

export const entry = pgTable(
  "entry",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    placeId: integer("place_id")
      .notNull()
      .references(() => place.id, { onDelete: "restrict" }),
    typeId: integer("type_id")
      .notNull()
      .references(() => kebabType.id, { onDelete: "restrict" }),
    meat: meatEnum("meat").notNull(),
    eatenAt: timestamp("eaten_at", { withTimezone: true }).notNull(),
    priceCents: integer("price_cents"),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    // actual GPS position when the entry was made – owner only
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    accuracyM: integer("accuracy_m"),
    overall: smallint("overall").notNull(),
    rMeat: smallint("r_meat"),
    rBread: smallint("r_bread"),
    rSauce: smallint("r_sauce"),
    rSalad: smallint("r_salad"),
    rPortion: smallint("r_portion"),
    rValue: smallint("r_value"),
    note: text("note"),
    photoKey: text("photo_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("entry_user_eaten_idx").on(t.userId, t.eatenAt.desc()),
    index("entry_place_idx").on(t.placeId),
    index("entry_eaten_idx").on(t.eatenAt.desc()),
  ],
);

export const entryCompanion = pgTable(
  "entry_companion",
  {
    entryId: integer("entry_id")
      .notNull()
      .references(() => entry.id, { onDelete: "cascade" }),
    friendUserId: text("friend_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.friendUserId] }), index("entry_companion_friend_idx").on(t.friendUserId)],
);

export const friendship = pgTable(
  "friendship",
  {
    id: serial("id").primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    addresseeId: text("addressee_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: friendshipStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("friendship_pair_uq").on(t.requesterId, t.addresseeId),
    index("friendship_addressee_idx").on(t.addresseeId),
    // a pair may only exist once regardless of direction
    uniqueIndex("friendship_pair_sym_uq").using(
      "btree",
      sql`least(${t.requesterId}, ${t.addresseeId})`,
      sql`greatest(${t.requesterId}, ${t.addresseeId})`,
    ),
  ],
);

export const badge = pgTable("badge", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const userBadge = pgTable(
  "user_badge",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    badgeId: integer("badge_id")
      .notNull()
      .references(() => badge.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const entryRelations = relations(entry, ({ one, many }) => ({
  user: one(user, { fields: [entry.userId], references: [user.id] }),
  place: one(place, { fields: [entry.placeId], references: [place.id] }),
  type: one(kebabType, { fields: [entry.typeId], references: [kebabType.id] }),
  companions: many(entryCompanion),
}));

export const entryCompanionRelations = relations(entryCompanion, ({ one }) => ({
  entry: one(entry, { fields: [entryCompanion.entryId], references: [entry.id] }),
  friend: one(user, { fields: [entryCompanion.friendUserId], references: [user.id] }),
}));

export const placeRelations = relations(place, ({ many }) => ({ entries: many(entry) }));

export type Entry = typeof entry.$inferSelect;
export type Place = typeof place.$inferSelect;
export type KebabType = typeof kebabType.$inferSelect;
export type User = typeof user.$inferSelect;
export type Meat = (typeof meatEnum.enumValues)[number];
