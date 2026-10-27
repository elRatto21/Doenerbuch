import { Plus } from "lucide-react";
import Link from "next/link";
import { KebabIcon } from "@/components/logo";

const STEPS = [
  { title: "Eintragen", text: "Sorte, Ort per GPS, Preis" },
  { title: "Bewerten", text: "Sterne für Fleisch, Brot, Sauce …" },
  { title: "Vergleichen", text: "Statistik & Rangliste mit Freunden" },
];

export function Welcome() {
  return (
    <div className="pb-nav">
      <section aria-labelledby="leer" className="card mx-5 mt-3 flex flex-col items-center gap-3 rounded-[20px] px-5 py-6 text-center shadow-hard-lg">
        <div aria-hidden="true" className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-2 border-ink bg-mustard">
          <KebabIcon size={64} color="var(--color-ink)" strokeWidth={1.8} />
        </div>
        <h2 id="leer" className="display m-0 mt-1 text-[26px] font-extrabold leading-[1.1] tracking-[-0.4px]">
          Dein Dönerbuch ist noch leer
        </h2>
        <Link href="/neu" className="btn btn-primary mt-1.5 self-stretch">
          <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
          Ersten Döner eintragen
        </Link>
        <Link href="/freunde/hinzufuegen" className="btn btn-secondary h-12 self-stretch rounded-[14px] text-[15px]">
          Freunde einladen
        </Link>
      </section>

      <section aria-labelledby="sofunkt" className="mx-5 mt-[22px]">
        <h2 id="sofunkt" className="display m-0 mb-2.5 text-[17px] font-bold">
          So funktioniert&apos;s
        </h2>
        <ol className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card-flat flex flex-col gap-1.5 px-2.5 py-3">
              <span className="display flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-ink bg-mustard text-[15px] font-extrabold">
                {i + 1}
              </span>
              <span className="text-sm font-bold">{s.title}</span>
              <span className="text-xs leading-[1.35] text-muted">{s.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
