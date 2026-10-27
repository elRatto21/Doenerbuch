export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border-2 border-ink bg-accent shadow-hard-sm"
      style={{ width: size, height: size }}
    >
      <KebabIcon size={Math.round(size * 0.55)} color="#FFFFFF" />
    </div>
  );
}

/** Döner spit – the app's own glyph, drawn in Lucide style. */
export function KebabIcon({ size = 24, color = "currentColor", strokeWidth = 2.2 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2v20" />
      <path d="M7 6h10l-1 4H8z" />
      <path d="M6.5 10h11l-1.2 4.5H7.7z" />
      <path d="M8 14.5h8l-1 3.5H9z" />
    </svg>
  );
}
