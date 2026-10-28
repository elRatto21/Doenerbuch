const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€",
  CHF: "CHF",
  GBP: "£",
  USD: "$",
  TRY: "₺",
  PLN: "zł",
  CZK: "Kč",
  DKK: "kr",
  SEK: "kr",
};

export const CURRENCY_NAME: Record<string, string> = {
  EUR: "Euro",
  CHF: "Schweizer Franken",
  GBP: "Britisches Pfund",
  USD: "US-Dollar",
  TRY: "Türkische Lira",
  PLN: "Złoty",
  CZK: "Tschechische Krone",
  DKK: "Dänische Krone",
  SEK: "Schwedische Krone",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? currency;
}

const decimal = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

/** 750 → "€ 7,50". `compact` drops cents for sums ("€ 362"). */
export function formatPrice(cents: number | null | undefined, currency = "EUR", compact = false): string {
  if (cents == null) return "–";
  const amount = cents / 100;
  return `${currencySymbol(currency)} ${compact ? whole.format(Math.round(amount)) : decimal.format(amount)}`;
}

/** "7,50" / "7.5" / "7" → 750. Returns null for empty or invalid input. */
export function parsePrice(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(/[€$£₺]/g, "");
  if (!cleaned) return null;
  // treat both , and . as decimal separator; drop thousands separators
  const normalized = cleaned.replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(Number.parseFloat(normalized) * 100);
}

export function priceInputValue(cents: number | null | undefined): string {
  if (cents == null) return "";
  return decimal.format(cents / 100);
}

/** 4.25 → "4,3" */
export function formatRating(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "–";
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** First name only, used in lists ("mit Lena"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function companionsLabel(names: string[]): string {
  if (names.length === 0) return "allein";
  return "mit " + names.map(firstName).join(", ");
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`;
}

export function formatCount(n: number): string {
  return whole.format(n);
}
