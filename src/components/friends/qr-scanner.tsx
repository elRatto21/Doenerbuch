"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** Turns a scanned value into an invite path, or null. */
export function invitePathFromScan(value: string): string | null {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/freunde\/einladung\/([^/?#]+)/);
    if (match) return `/freunde/einladung/${match[1]}`;
  } catch {
    /* not a URL */
  }
  const code = trimmed.toUpperCase().replace(/Ö/g, "O").replace(/[^A-Z0-9]/g, "");
  const suffix = code.startsWith("DON") ? code.slice(3) : code;
  return /^[A-Z0-9]{4}$/.test(suffix) ? `/freunde/einladung/${suffix}` : null;
}

export function QrScanner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    dialog.current?.showModal();
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = document.createElement("canvas");

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setError("Kein Kamerazugriff. Erlaube die Kamera oder gib den Code unten ein.");
        return;
      }
      const el = video.current;
      if (!el || stopped) return;
      el.srcObject = stream;
      await el.play().catch(() => undefined);

      const native = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;
      const jsQR = native ? null : (await import("jsqr")).default;

      const tick = async () => {
        if (stopped || !el.videoWidth) {
          timer = setTimeout(tick, 250);
          return;
        }
        let value: string | null = null;
        if (native) {
          const codes = await native.detect(el).catch(() => []);
          value = codes[0]?.rawValue ?? null;
        } else if (jsQR) {
          const scale = Math.min(1, 640 / el.videoWidth);
          canvas.width = Math.round(el.videoWidth * scale);
          canvas.height = Math.round(el.videoHeight * scale);
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            value = jsQR(img.data, img.width, img.height)?.data ?? null;
          }
        }
        if (value) {
          const path = invitePathFromScan(value);
          if (path) {
            stopped = true;
            router.push(path);
            onCloseRef.current();
            return;
          }
          setHint("Das ist kein Dönerbuch-Code.");
        }
        timer = setTimeout(tick, 250);
      };
      void tick();
    }

    void start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="scan-title"
      className="card m-auto w-[min(400px,calc(100vw-32px))] p-4 text-ink backdrop:bg-ink/60"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 id="scan-title" className="display m-0 text-xl font-extrabold">
          QR-Code scannen
        </h2>
        <button type="button" aria-label="Schließen" onClick={() => dialog.current?.close()} className="icon-btn">
          <X size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <p role="alert" className="m-0 text-[15px]">
          {error}
        </p>
      ) : (
        <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-ink bg-ink">
          <video ref={video} muted playsInline className="h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-[18%] rounded-2xl border-4 border-mustard" />
        </div>
      )}
      <p className="mb-0 mt-3 text-sm text-muted" aria-live="polite">
        {hint ?? "Halte die Kamera auf den Code deines Freundes."}
      </p>
    </dialog>
  );
}
