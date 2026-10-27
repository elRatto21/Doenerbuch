import { sql } from "drizzle-orm";
import { db } from "@/db";
import { fmt } from "@/lib/time";
import { MEAT_LABEL } from "@/lib/validation";

function cell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  // quote when needed; neutralise spreadsheet formulas
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const HEADER = [
  "Datum", "Uhrzeit", "Imbiss", "Adresse", "Stadt", "Sorte", "Fleisch", "Preis", "Währung",
  "Gesamt", "Fleisch (Note)", "Brot", "Sauce", "Salat & Gemüse", "Portion", "Preis/Leistung",
  "Mit", "Notiz", "Breitengrad", "Längengrad", "Genauigkeit (m)",
];

/** All own entries as CSV (semicolon-separated, German decimals – opens cleanly in Excel/Numbers). */
export async function entriesCsv(userId: string): Promise<string> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select e.*, p.name as place_name, p.address, p.city, t.name as type_name,
      coalesce((select string_agg(u.name, ', ' order by u.name) from entry_companion c join "user" u on u.id = c.friend_user_id where c.entry_id = e.id), '') as companions
    from entry e join place p on p.id = e.place_id join kebab_type t on t.id = e.type_id
    where e.user_id = ${userId}
    order by e.eaten_at desc`);
  const num = (v: unknown) => (v == null ? "" : String(v).replace(".", ","));
  const lines = rows.map((r) =>
    [
      fmt(r.eaten_at as string, "yyyy-MM-dd"),
      fmt(r.eaten_at as string, "HH:mm"),
      r.place_name,
      r.address,
      r.city,
      r.type_name,
      MEAT_LABEL[r.meat as keyof typeof MEAT_LABEL],
      r.price_cents == null ? "" : (Number(r.price_cents) / 100).toFixed(2).replace(".", ","),
      String(r.currency).trim(),
      r.overall,
      r.r_meat,
      r.r_bread,
      r.r_sauce,
      r.r_salad,
      r.r_portion,
      r.r_value,
      r.companions,
      r.note,
      num(r.lat),
      num(r.lng),
      r.accuracy_m,
    ]
      .map(cell)
      .join(";"),
  );
  // BOM so Excel detects UTF-8 (Umlaute)
  return "﻿" + [HEADER.join(";"), ...lines].join("\r\n") + "\r\n";
}
