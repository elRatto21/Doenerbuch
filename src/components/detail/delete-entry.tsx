"use client";

import { Trash2 } from "lucide-react";
import { useRef, useTransition } from "react";
import { deleteEntryAction } from "@/server/actions/entries";

export function DeleteEntryButton({ entryId }: { entryId: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 self-start border-0 bg-transparent p-0 text-sm font-bold text-accent"
      >
        <Trash2 size={16} aria-hidden="true" /> Eintrag löschen
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="del-title"
        className="card m-auto w-[min(360px,calc(100vw-40px))] p-5 text-ink backdrop:bg-ink/40"
      >
        <h2 id="del-title" className="display m-0 text-xl font-extrabold">
          Eintrag löschen?
        </h2>
        <p className="mb-4 mt-2 text-[15px] text-muted">Das kann nicht rückgängig gemacht werden.</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary h-12 flex-1" onClick={() => dialog.current?.close()} disabled={pending}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn h-12 flex-1 bg-accent text-white hover:text-white"
            disabled={pending}
            onClick={() => startTransition(() => deleteEntryAction(entryId))}
          >
            {pending ? "Löschen …" : "Löschen"}
          </button>
        </div>
      </dialog>
    </>
  );
}
