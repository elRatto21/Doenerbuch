"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { answerFriendRequest, cancelFriendship, sendFriendRequest } from "@/server/actions/friends";
import type { Relation } from "@/server/queries/friends";

const LABEL: Record<Relation, string> = {
  none: "Hinzufügen",
  outgoing: "Angefragt",
  incoming: "Annehmen",
  friends: "Freunde",
  self: "Du",
};

export function RelationButton({ userId, relation: initial }: { userId: string; relation: Relation }) {
  const [relation, setRelation] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const muted = relation === "outgoing" || relation === "friends" || relation === "self";

  function onClick() {
    if (relation === "friends" || relation === "self") return;
    startTransition(async () => {
      const result = relation === "outgoing" ? await cancelFriendship(userId) : await sendFriendRequest(userId);
      setRelation(result.relation);
      setError(result.error ?? null);
    });
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
    <button
      type="button"
      onClick={onClick}
      disabled={pending || relation === "friends" || relation === "self"}
      aria-pressed={relation === "outgoing" ? true : undefined}
      title={relation === "outgoing" ? "Anfrage zurückziehen" : undefined}
      className={`btn h-11 shrink-0 rounded-[10px] px-3 text-[13px] disabled:!opacity-100 ${muted ? "bg-ground text-muted" : "bg-mustard text-ink"}`}
    >
      {LABEL[relation]}
    </button>
      {error ? (
        <span role="alert" className="max-w-[160px] text-right text-[11px] font-medium text-accent">
          {error}
        </span>
      ) : null}
    </span>
  );
}

export function RequestButtons({ requestId, name }: { requestId: number; name: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  function answer(accept: boolean) {
    startTransition(async () => {
      const result = await answerFriendRequest(requestId, accept);
      if (result.error) setError(result.error);
      else setDone(accept ? "accepted" : "declined");
    });
  }
  if (error) return <span role="alert" className="max-w-[140px] text-right text-[12px] font-medium text-accent">{error}</span>;
  if (done) return <span className="text-[13px] font-bold text-muted">{done === "accepted" ? "Angenommen" : "Abgelehnt"}</span>;
  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-label={`Anfrage von ${name} ablehnen`}
        disabled={pending}
        onClick={() => answer(false)}
        className="icon-btn"
      >
        <X size={20} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Anfrage von ${name} annehmen`}
        disabled={pending}
        onClick={() => answer(true)}
        className="icon-btn bg-accent text-white hover:text-white"
      >
        <Check size={20} strokeWidth={2.6} aria-hidden="true" />
      </button>
    </div>
  );
}
