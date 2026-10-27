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
  const [pending, startTransition] = useTransition();
  const muted = relation === "outgoing" || relation === "friends" || relation === "self";

  function onClick() {
    if (relation === "friends" || relation === "self") return;
    startTransition(async () => {
      setRelation(relation === "outgoing" ? await cancelFriendship(userId) : await sendFriendRequest(userId));
    });
  }

  return (
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
  );
}

export function RequestButtons({ requestId, name }: { requestId: number; name: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  if (done) return <span className="text-[13px] font-bold text-muted">{done === "accepted" ? "Angenommen" : "Abgelehnt"}</span>;
  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-label={`Anfrage von ${name} ablehnen`}
        disabled={pending}
        onClick={() => startTransition(async () => { await answerFriendRequest(requestId, false); setDone("declined"); })}
        className="icon-btn"
      >
        <X size={20} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Anfrage von ${name} annehmen`}
        disabled={pending}
        onClick={() => startTransition(async () => { await answerFriendRequest(requestId, true); setDone("accepted"); })}
        className="icon-btn bg-accent text-white hover:text-white"
      >
        <Check size={20} strokeWidth={2.6} aria-hidden="true" />
      </button>
    </div>
  );
}
