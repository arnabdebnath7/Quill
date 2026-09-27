import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, journalEntries, trades, watchlist } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { displayEmail } from "@/lib/identity";
import { serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/account — export everything as JSON */
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const [t, j, w, c] = await Promise.all([
      db.select().from(trades).where(eq(trades.userId, user.id)),
      db.select().from(journalEntries).where(eq(journalEntries.userId, user.id)),
      db.select().from(watchlist).where(eq(watchlist.userId, user.id)),
      db.select().from(dailyCheckins).where(eq(dailyCheckins.userId, user.id)),
    ]);
    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        user: { name: user.name, email: displayEmail(user.email), phone: user.phone, memberSince: user.createdAt },
        trades: t,
        journal: j,
        watchlist: w,
        checkins: c,
      },
      { headers: { "Content-Disposition": `attachment; filename="quill-export-${new Date().toISOString().slice(0, 10)}.json"` } },
    );
  } catch (error) {
    return serverError("account.export", error);
  }
}

/** POST /api/account — wipe personal data (keeps the account itself) */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;

  if (body?.action !== "clear-all") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(trades).where(eq(trades.userId, user.id));
      await tx.delete(journalEntries).where(eq(journalEntries.userId, user.id));
      await tx.delete(watchlist).where(eq(watchlist.userId, user.id));
      await tx.delete(dailyCheckins).where(eq(dailyCheckins.userId, user.id));
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("account.clear", error);
  }
}
