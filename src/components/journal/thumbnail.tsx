"use client";

import { useState } from "react";

/**
 * Journal thumbnail. Photos uploaded before thumbnails existed fall back to the full image;
 * if that fails too (object missing), the `placeholder` (date box) is shown instead.
 */
export function Thumbnail({ src, fallback, alt, placeholder }: { src: string; fallback: string; alt: string; placeholder: React.ReactNode }) {
  const [current, setCurrent] = useState<string | null>(src);
  if (!current) return placeholder;
  return (
    <div className="w-[64px] shrink-0 overflow-hidden rounded-[10px] border-2 border-ink bg-map">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed/public S3 URLs, no optimizer needed */}
      <img
        src={current}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full min-h-[64px] w-full object-cover"
        onError={() => setCurrent(current === fallback ? null : fallback)}
      />
    </div>
  );
}
