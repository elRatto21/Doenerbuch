import { initials } from "@/lib/format";

export function Avatar({
  name,
  imageUrl,
  size = 36,
  highlight = false,
  className = "",
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`display inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-ink font-bold text-ink ${
        highlight ? "bg-mustard" : "bg-ground"
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs, no optimizer needed
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
