import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";

export function PageHeader({
  title,
  backHref,
  variant = "back",
  right,
}: {
  title: string;
  backHref: string;
  variant?: "back" | "close";
  right?: React.ReactNode;
}) {
  const Icon = variant === "close" ? X : ArrowLeft;
  return (
    <header className="grid grid-cols-[44px_1fr_44px] items-center px-4 pb-2 pt-4">
      <Link href={backHref} aria-label={variant === "close" ? "Schließen" : "Zurück"} className="icon-btn">
        <Icon size={20} strokeWidth={2.4} aria-hidden="true" />
      </Link>
      <h1 className="display m-0 text-center text-xl font-extrabold">{title}</h1>
      <div className="flex justify-end">{right}</div>
    </header>
  );
}
