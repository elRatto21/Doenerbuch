export function StarIcon({ size = 16, filled, strokeWidth = 1.8 }: { size?: number; filled: boolean; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "var(--color-mustard)" : "var(--color-surface)"}
      stroke="var(--color-ink)"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rounded} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} filled={i <= rounded} />
      ))}
    </div>
  );
}
