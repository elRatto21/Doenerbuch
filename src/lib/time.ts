import { TZDate } from "@date-fns/tz";
import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  format,
  startOfMonth,
  startOfYear,
  addMonths,
  addYears,
} from "date-fns";
import { de } from "date-fns/locale";

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Europe/Berlin";

export function inTz(date: Date | string | number): TZDate {
  return new TZDate(new Date(date), APP_TIMEZONE);
}

export function fmt(date: Date | string | number, pattern: string): string {
  return format(inTz(date), pattern, { locale: de });
}

/** [start, end) of the month containing `date`, in the app time zone. */
export function monthRange(date: Date = new Date()): [Date, Date] {
  const start = startOfMonth(inTz(date));
  return [new Date(start.getTime()), new Date(addMonths(start, 1).getTime())];
}

export function yearRange(date: Date = new Date()): [Date, Date] {
  const start = startOfYear(inTz(date));
  return [new Date(start.getTime()), new Date(addYears(start, 1).getTime())];
}

/** "vor 5 Min.", "vor 2 Std.", "heute", "gestern", "vor 3 Tagen", "12.03." */
export function relativeTime(date: Date | string, now: Date = new Date()): string {
  const d = new Date(date);
  const minutes = differenceInMinutes(now, d);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = differenceInHours(now, d);
  if (hours < 6) return `vor ${hours} Std.`;
  const days = differenceInCalendarDays(inTz(now), inTz(d));
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;
  return fmt(d, "dd.MM.");
}

/** "heute", "gestern", or "am 12.03." – used for "Zuletzt …". */
export function dayLabel(date: Date | string, now: Date = new Date()): string {
  const days = differenceInCalendarDays(inTz(now), inTz(date));
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  return "am " + fmt(date, "dd.MM.yy");
}
