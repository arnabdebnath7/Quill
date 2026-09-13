import { NextResponse } from "next/server";
import { z } from "zod";
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

const actionSchema = z.object({ action: z.enum(["reset-demo", "clear-all"]) });

/** POST /api/account — wipe personal data, restore the demo set */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof actionSchema>;
  try {
    body = actionSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Unknown action. Expected reset-demo or clear-all." }, { status: 400 });
  }

  await Promise.all([
    db.delete(trades).where(eq(trades.userId, user.id)),
    db.delete(journalEntries).where(eq(journalEntries.userId, user.id)),
    db.delete(watchlist).where(eq(watchlist.userId, user.id)),
  ]);

  if (body.action === "reset-demo") {
    await seedUserDemoData(user.id);
  }
  return NextResponse.json({ ok: true });
}
