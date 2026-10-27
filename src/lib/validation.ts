import { z } from "zod";

export const USERNAME_PATTERN = /^[a-z0-9_.]{3,24}$/;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "3–24 Zeichen: Kleinbuchstaben, Ziffern, Punkt oder Unterstrich");

export const CURRENCIES = ["EUR", "CHF", "GBP", "USD", "TRY", "PLN", "CZK", "DKK", "SEK"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const currencySchema = z.enum(CURRENCIES);

export const MEATS = ["kalb", "haehnchen", "hack", "steak", "veggie", "unbekannt"] as const;
export const MEAT_LABEL: Record<(typeof MEATS)[number], string> = {
  kalb: "Kalb",
  haehnchen: "Hähnchen",
  hack: "Hack",
  steak: "Steak",
  veggie: "Veggie",
  unbekannt: "Unbekannt",
};

export const RATING_CATEGORIES = [
  { key: "rMeat", label: "Fleisch" },
  { key: "rBread", label: "Brot" },
  { key: "rSauce", label: "Sauce" },
  { key: "rSalad", label: "Salat & Gemüse" },
  { key: "rPortion", label: "Portion" },
  { key: "rValue", label: "Preis/Leistung" },
] as const;
export type RatingKey = (typeof RATING_CATEGORIES)[number]["key"];

const rating = z.number().int().min(1).max(5);

/** What is captured right when eating: no rating yet. */
export const entryInputSchema = z.object({
  eatenAt: z.iso.datetime({ offset: true }),
  typeId: z.number().int().positive(),
  meat: z.enum(MEATS),
  placeId: z.number().int().positive().nullable(),
  placeName: z.string().trim().min(1, "Name des Imbiss fehlt").max(120),
  placeAddress: z.string().trim().max(200).nullable(),
  placeCity: z.string().trim().max(120).nullable(),
  placeOsmId: z.string().max(40).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  accuracyM: z.number().int().min(0).max(100000).nullable(),
  priceCents: z.number().int().min(0).max(100000).nullable(),
  currency: currencySchema,
  photoKey: z.string().max(200).nullable(),
  companionIds: z.array(z.string().min(1)).max(20),
});
export type EntryInput = z.infer<typeof entryInputSchema>;

/** The rating, given afterwards. */
export const ratingInputSchema = z.object({
  overall: rating,
  rMeat: rating.nullable(),
  rBread: rating.nullable(),
  rSauce: rating.nullable(),
  rSalad: rating.nullable(),
  rPortion: rating.nullable(),
  rValue: rating.nullable(),
  note: z.string().trim().max(1000).nullable(),
});
export type RatingInput = z.infer<typeof ratingInputSchema>;
