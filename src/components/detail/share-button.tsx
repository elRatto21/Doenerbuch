"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

/** Web Share API with clipboard fallback. */
export function ShareButton({ title, text, url, className = "icon-btn h-[52px] w-[52px] rounded-[14px]" }: { title: string; text: string; url?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const shareUrl = url ?? window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        /* user cancelled */
      }
      return;
    }
    await navigator.clipboard?.writeText(`${text} ${shareUrl}`).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" aria-label={copied ? "Link kopiert" : "Teilen"} onClick={() => void share()} className={className}>
      <Share2 size={20} strokeWidth={2.2} aria-hidden="true" />
      <span className="sr-only" aria-live="polite">
        {copied ? "Link kopiert" : ""}
      </span>
    </button>
  );
}
