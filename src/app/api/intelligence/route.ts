import { NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, journalEntries, trades } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { buildIntelligence } from "@/lib/intelligence";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const checkinCutoff = new Date();
  checkinCutoff.setDate(checkinCutoff.getDate() - 120);

  const [userTrades, checkins, journals] = await Promise.all([
    db.select().from(trades).where(eq(trades.userId, user.id)).orderBy(desc(trades.entryAt)),
    db.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, user.id), gte(dailyCheckins.date, checkinCutoff.toISOString().slice(0, 10)))).orderBy(desc(dailyCheckins.date)),
    db.select().from(journalEntries).where(eq(journalEntries.userId, user.id)).orderBy(desc(journalEntries.createdAt)),
  ]);

  return NextResponse.json({ intelligence: buildIntelligence({ trades: userTrades, checkins, journals }) });
}
