import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadIntelligence, sanitizeTimeZone } from "@/lib/intelligence-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const timeZone = sanitizeTimeZone(new URL(request.url).searchParams.get("tz"));
    const intelligence = await loadIntelligence(user.id, timeZone);
    return NextResponse.json({ intelligence }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[intelligence] failed", error);
    return NextResponse.json({ error: "Could not build your intelligence report right now." }, { status: 500 });
  }
}
