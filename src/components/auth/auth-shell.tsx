import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";

/** Auth pages sit directly on the background – no card. */
export function AuthShell({
  title,
  subtitle,
  backHref,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col px-5 pb-10 pt-4">
      <div className="flex h-11 items-center">
        {backHref ? (
          <Link href={backHref} aria-label="Zurück" className="icon-btn">
            <ArrowLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        ) : (
          <LogoMark size={36} />
        )}
      </div>
      <div className="mt-6">
        <h1 className="display m-0 text-[32px] font-extrabold leading-[1.05] tracking-[-0.6px]">{title}</h1>
        {subtitle ? <p className="m-0 mt-2 text-[15px] leading-snug text-muted">{subtitle}</p> : null}
      </div>
      <div className="mt-7 flex flex-col gap-4">{children}</div>
    </main>
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input id={id} name={id} className="field" aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-hint` : undefined} {...props} />
      {error ? (
        <span id={`${id}-hint`} className="text-[13px] font-medium text-accent">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 rounded-xl border-2 border-ink bg-accent-soft px-3 py-2 text-sm font-medium">
      {message}
    </p>
  );
}

export function GoogleButton({ onClick, disabled, className = "h-14" }: { onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`btn btn-secondary w-full rounded-[14px] text-[16px] ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
      </svg>
      Mit Google fortfahren
    </button>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted" role="separator">
      <span className="h-0.5 flex-1 bg-hairline" />
      oder
      <span className="h-0.5 flex-1 bg-hairline" />
    </div>
  );
}
