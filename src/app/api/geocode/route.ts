import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { geocoder } from "@/server/geocode";

const query = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const result = await geocoder.reverse(parsed.data.lat, parsed.data.lng);
  return NextResponse.json(result ?? { address: null, city: null, poiName: null, osmId: null });
}
