import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, user.id))
    .orderBy(asc(watchlist.createdAt));
  return NextResponse.json({ items: rows });
}

const createSchema = z.object({
  symbol: z.string().min(1).max(24),
  name: z.string().min(1).max(120),
  market: z.enum(["us", "india", "forex", "crypto", "gold"]),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid symbol", details: String(e) }, { status: 400 });
  }

  const [row] = await db
    .insert(watchlist)
    .values({ userId: user.id, symbol: body.symbol.toUpperCase(), name: body.name, market: body.market })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    const [existing] = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, user.id))
      .limit(200);
    void existing;
    return NextResponse.json({ error: "Already in watchlist" }, { status: 409 });
  }
  return NextResponse.json({ item: row }, { status: 201 });
}
