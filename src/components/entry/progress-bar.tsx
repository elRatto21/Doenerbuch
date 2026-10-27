export function ProgressBar({ value }: { value: number }) {
  return (
    <div aria-hidden="true" className="mx-5 mt-1 h-2 overflow-hidden rounded-md border-2 border-ink bg-surface">
      <div className="h-full bg-accent" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}
