import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { trades } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { likePattern, parseBody, parseTimestamp, serverError, tradeFields, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const market = url.searchParams.get("market");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim().slice(0, 80);

  const conds = [eq(trades.userId, user.id)];
  if (market && market !== "all") conds.push(eq(trades.market, market));
  if (status && status !== "all") conds.push(eq(trades.status, status));
  if (q) {
    const pattern = likePattern(q);
    conds.push(or(ilike(trades.symbol, pattern), ilike(trades.notes, pattern), ilike(trades.setup, pattern), ilike(trades.name, pattern))!);
  }

  try {
    const rows = await db.select().from(trades).where(and(...conds)).orderBy(desc(trades.entryAt), desc(trades.createdAt));
    return NextResponse.json({ trades: rows });
  } catch (error) {
    return serverError("trades.list", error);
  }
}

const createSchema = z.object({
  symbol: tradeFields.symbol,
  name: tradeFields.name.optional(),
  market: tradeFields.market,
  side: tradeFields.side.default("long"),
  quantity: tradeFields.quantity,
  entryPrice: tradeFields.entryPrice,
  exitPrice: tradeFields.exitPrice.optional(),
  entryAt: tradeFields.entryAt,
  exitAt: tradeFields.exitAt.optional(),
  fees: tradeFields.fees.default(0),
  stopLoss: tradeFields.stopLoss.optional(),
  target: tradeFields.target.optional(),
  setup: tradeFields.setup.optional(),
  notes: tradeFields.notes.optional(),
  mood: tradeFields.mood.optional(),
  rating: tradeFields.rating.optional(),
  tags: tradeFields.tags.default([]),
  riskAmount: tradeFields.riskAmount.optional(),
  preTradePlan: tradeFields.preTradePlan.default(""),
  entryReason: tradeFields.entryReason.default(""),
  exitReason: tradeFields.exitReason.default(""),
  mistake: tradeFields.mistake.default(""),
  lesson: tradeFields.lesson.default(""),
  rulesFollowed: tradeFields.rulesFollowed.optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const parsed = await parseBody(req, createSchema, "Invalid trade");
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const closed = body.exitPrice != null;
  const entryAt = parseTimestamp(body.entryAt)!;
  const exitAt = closed ? (body.exitAt ? parseTimestamp(body.exitAt) : null) ?? new Date() : null;
  if (exitAt && exitAt < entryAt) {
    return NextResponse.json({ error: "Exit time cannot be before entry time." }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(trades)
      .values({
        userId: user.id,
        symbol: body.symbol.toUpperCase(),
        name: body.name ?? null,
        market: body.market,
        side: body.side,
        status: closed ? "closed" : "open",
        quantity: String(body.quantity),
        entryPrice: String(body.entryPrice),
        exitPrice: body.exitPrice != null ? String(body.exitPrice) : null,
        entryAt,
        exitAt,
        fees: String(body.fees),
        stopLoss: body.stopLoss != null ? String(body.stopLoss) : null,
        target: body.target != null ? String(body.target) : null,
        setup: body.setup ?? null,
        notes: body.notes ?? null,
        mood: body.mood ?? null,
        rating: body.rating ?? null,
        tags: body.tags,
        riskAmount: body.riskAmount != null ? String(body.riskAmount) : null,
        preTradePlan: body.preTradePlan,
        entryReason: body.entryReason,
        exitReason: body.exitReason,
        mistake: body.mistake,
        lesson: body.lesson,
        rulesFollowed: body.rulesFollowed ?? null,
      })
      .returning();
    return NextResponse.json({ trade: row }, { status: 201 });
  } catch (error) {
    return serverError("trades.create", error);
  }
}
