import { NextResponse } from "next/server";
import { db } from "@/db";
import { journalEntries, trades, watchlist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { seedUserDemoData } from "@/db/seed";

/** GET /api/account — export everything as JSON */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [t, j, w] = await Promise.all([
    db.select().from(trades).where(eq(trades.userId, user.id)),
    db.select().from(journalEntries).where(eq(journalEntries.userId, user.id)),
    db.select().from(watchlist).where(eq(watchlist.userId, user.id)),
  ]);
  return NextResponse.json({ exportedAt: new Date().toISOString(), user: { email: user.email, name: user.name }, trades: t, journal: j, watchlist: w });
}

/** POST /api/account — wipe personal data, restore the demo set */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action } = await req.json().catch(() => ({ action: "" }));

  if (action === "reset-demo") {
    await db.delete(trades).where(eq(trades.userId, user.id));
    await db.delete(journalEntries).where(eq(journalEntries.userId, user.id));
    await db.delete(watchlist).where(eq(watchlist.userId, user.id));
    await seedUserDemoData(user.id);
    return NextResponse.json({ ok: true });
  }
  if (action === "clear-all") {
    await db.delete(trades).where(eq(trades.userId, user.id));
    await db.delete(journalEntries).where(eq(journalEntries.userId, user.id));
    await db.delete(watchlist).where(eq(watchlist.userId, user.id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
