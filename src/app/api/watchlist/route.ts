import { NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { MARKET_KEYS, parseBody, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";
const MAX_ITEMS = 200;

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  try {
    const rows = await db.select().from(watchlist).where(eq(watchlist.userId, user.id)).orderBy(asc(watchlist.createdAt));
    return NextResponse.json({ items: rows });
  } catch (error) {
    return serverError("watchlist.list", error);
  }
}

const createSchema = z.object({
  symbol: z.string().trim().min(1).max(24),
  name: z.string().trim().min(1).max(120),
  market: z.enum(MARKET_KEYS),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const parsed = await parseBody(req, createSchema, "Invalid symbol");
  if ("response" in parsed) return parsed.response;
  const symbol = parsed.data.symbol.toUpperCase();
  const { name, market } = parsed.data;

  try {
    const existing = await db.select().from(watchlist).where(eq(watchlist.userId, user.id));
    if (existing.some((item) => item.symbol === symbol && item.market === market)) {
      return NextResponse.json({ error: `${symbol} is already on your watchlist.` }, { status: 409 });
    }
    if (existing.length >= MAX_ITEMS) {
      return NextResponse.json({ error: `Your watchlist is full (${MAX_ITEMS} symbols).` }, { status: 409 });
    }
    const [row] = await db.insert(watchlist).values({ userId: user.id, symbol, name, market }).returning();
    return NextResponse.json({ item: row }, { status: 201 });
  } catch (error) {
    return serverError("watchlist.create", error);
  }
}

export async function DELETE(req: Request) {
  // Convenience: remove by market+symbol (used when the same symbol was added twice historically).
  const user = await requireUser();
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  const market = url.searchParams.get("market");
  if (!symbol || !market) return NextResponse.json({ error: "symbol and market are required" }, { status: 400 });
  try {
    await db.delete(watchlist).where(and(eq(watchlist.userId, user.id), eq(watchlist.symbol, symbol), eq(watchlist.market, market)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("watchlist.delete", error);
  }
}
