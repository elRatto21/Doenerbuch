"use client";

import { Link2, ScanLine } from "lucide-react";
import { useState } from "react";
import { QrScanner } from "./qr-scanner";

export function InviteActions({ link, code }: { link: string; code: string }) {
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `Lass uns im Dönerbuch vergleichen, wer mehr Döner isst! Mein Code: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Dönerbuch-Einladung", text, url: link });
      } catch {
        /* cancelled */
      }
      return;
    }
    await navigator.clipboard?.writeText(`${text} ${link}`).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => void share()} className="btn btn-primary h-[52px] text-base">
          <Link2 size={18} strokeWidth={2.4} aria-hidden="true" />
          {copied ? "Kopiert!" : "Link teilen"}
        </button>
        <button type="button" onClick={() => setScanning(true)} className="btn btn-secondary h-[52px] rounded-[14px] text-base shadow-hard">
          <ScanLine size={18} strokeWidth={2.4} aria-hidden="true" />
          QR scannen
        </button>
      </div>
      {scanning ? <QrScanner onClose={() => setScanning(false)} /> : null}
    </>
  );
}
