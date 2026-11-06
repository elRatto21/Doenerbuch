/** Badge catalogue. Evaluated in src/server/badges.ts after each change to a user's entries. */
export const BADGES = [
  { key: "first", mark: "1", name: "Erster Döner", description: "Deinen ersten Döner eingetragen" },
  { key: "ten", mark: "10", name: "10 Döner", description: "10 Döner eingetragen" },
  { key: "fifty", mark: "50", name: "50 Döner", description: "50 Döner eingetragen" },
  { key: "hundred", mark: "100", name: "Dönerlegende", description: "100 Döner eingetragen" },
  { key: "same_type_10", mark: "10×", name: "Treue Sorte", description: "10× die gleiche Sorte gegessen" },
  { key: "regular", mark: "★", name: "Stammgast", description: "5× am gleichen Ort gewesen" },
  { key: "cities_5", mark: "5", name: "5 Städte", description: "Döner in 5 verschiedenen Städten" },
  { key: "places_10", mark: "◎", name: "Entdecker", description: "10 verschiedene Imbisse besucht" },
  { key: "all_types", mark: "7", name: "Allesesser", description: "Alle Standard-Sorten probiert" },
  { key: "social_5", mark: "2+", name: "Gesellig", description: "5× mit Freunden gegessen" },
  { key: "night_owl", mark: "☾", name: "Nachteule", description: "Einen Döner nach 23 Uhr gegessen" },
  { key: "perfect", mark: "5,0", name: "Volltreffer", description: "Einen Döner mit 5 Sternen in allen Kategorien bewertet" },
] as const;

export type BadgeKey = (typeof BADGES)[number]["key"];

export const STANDARD_TYPES = ["Döner", "Dürüm", "Döner-Box", "Lahmacun", "Teller", "Yufka", "Pide"] as const;
