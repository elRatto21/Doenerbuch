import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { fmt } from "@/lib/time";
import { entriesCsv } from "@/server/csv";
import { rateLimit, RateLimitError } from "@/server/rate-limit";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect(new URL("/login?next=/profil", request.url));
  try {
    rateLimit("export", session.user.id);
  } catch (err) {
    if (err instanceof RateLimitError) return new NextResponse(err.message, { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } });
    throw err;
  }
  const csv = await entriesCsv(session.user.id);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="doenerbuch-${fmt(new Date(), "yyyy-MM-dd")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
