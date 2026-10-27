export function ListSkeleton({ header = true, tiles = 0, rows = 4 }: { header?: boolean; tiles?: number; rows?: number }) {
  return (
    <main className="pb-nav animate-pulse" aria-busy="true" aria-label="Lädt">
      {header ? <div className="mx-5 mb-4 mt-6 h-9 w-44 rounded-xl bg-hairline" /> : null}
      {tiles > 0 ? (
        <div className="grid gap-2.5 px-5 pb-4" style={{ gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))` }}>
          {Array.from({ length: tiles }, (_, i) => (
            <div key={i} className="h-[74px] rounded-[14px] border-2 border-hairline bg-surface" />
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 px-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-[86px] rounded-2xl border-2 border-hairline bg-surface" />
        ))}
      </div>
      <span className="sr-only" role="status">
        Lädt …
      </span>
    </main>
  );
}
