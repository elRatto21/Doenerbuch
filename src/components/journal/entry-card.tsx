import Link from "next/link";
import { Stars } from "@/components/stars";
import { companionsLabel, formatPrice } from "@/lib/format";
import { fmt } from "@/lib/time";
import type { JournalEntry } from "@/server/queries/entries";

export function EntryCard({ entry }: { entry: JournalEntry }) {
  return (
    <li>
      <Link href={`/eintrag/${entry.id}`} className="card flex items-stretch gap-3 p-3 text-ink no-underline hover:text-ink">
        <div className="flex w-[52px] shrink-0 flex-col items-center justify-center rounded-[10px] border-2 border-ink bg-ground">
          <span className="display text-[22px] font-extrabold leading-none">{fmt(entry.eatenAt, "dd")}</span>
          <span className="mt-0.5 text-[11px] font-bold tracking-[0.5px]">{fmt(entry.eatenAt, "EEEEEE").toUpperCase()}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="display truncate text-[17px] font-bold">{entry.placeName}</span>
            <span className="shrink-0 text-[15px] font-bold tabular-nums">{entry.priceCents != null ? formatPrice(entry.priceCents, entry.currency) : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-muted">
            <span className="chip">{entry.typeName}</span>
            <span className="truncate">{entry.placeAddress ?? ""}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <Stars value={entry.overall} />
            <span className="truncate pl-2 text-xs text-muted">{companionsLabel(entry.companions)}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
