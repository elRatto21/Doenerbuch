import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { fmt } from "@/lib/time";
import { entriesCsv } from "@/server/csv";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect(new URL("/login?next=/profil", request.url));
  const csv = await entriesCsv(session.user.id);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="doenerbuch-${fmt(new Date(), "yyyy-MM-dd")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
