import { NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, journalEntries, trades } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { buildIntelligence } from "@/lib/intelligence";
import { runQuillCoach } from "@/lib/quill-agent";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { question?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // Empty request body is valid; Quill will use the default review question.
  }

  const question = typeof body.question === "string" ? body.question.slice(0, 500) : undefined;
  const checkinCutoff = new Date();
  checkinCutoff.setDate(checkinCutoff.getDate() - 120);

  const [userTrades, checkins, journals] = await Promise.all([
    db.select().from(trades).where(eq(trades.userId, user.id)).orderBy(desc(trades.entryAt)),
    db
      .select()
      .from(dailyCheckins)
      .where(
        and(
          eq(dailyCheckins.userId, user.id),
          gte(dailyCheckins.date, checkinCutoff.toISOString().slice(0, 10)),
        ),
      )
      .orderBy(desc(dailyCheckins.date)),
    db.select().from(journalEntries).where(eq(journalEntries.userId, user.id)).orderBy(desc(journalEntries.createdAt)),
  ]);

  const intelligence = buildIntelligence({ trades: userTrades, checkins, journals });
  const coach = await runQuillCoach(intelligence, question);

  if (coach.status === "disabled") {
    return NextResponse.json({ error: "AI coaching is not configured yet.", code: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  if (coach.status === "blocked") {
    return NextResponse.json({ error: coach.reason, code: "AI_RELEASE_BLOCKED" }, { status: 502 });
  }

  return NextResponse.json({ coach: coach.output, generatedAt: new Date().toISOString() });
}
