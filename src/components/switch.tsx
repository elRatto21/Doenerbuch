"use client";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[52px] shrink-0 cursor-pointer rounded-full border-2 border-ink p-0 transition-colors disabled:opacity-60 ${
        checked ? "bg-accent" : "bg-map"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[22px] w-[22px] rounded-full border-2 border-ink bg-surface transition-[left] ${
          checked ? "left-[23px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}
