import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trades } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isValidUuid, notFound, parseBody, parseTimestamp, serverError, tradeFields, unauthorized } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  symbol: tradeFields.symbol.optional(),
  name: tradeFields.name.optional(),
  market: tradeFields.market.optional(),
  side: tradeFields.side.optional(),
  quantity: tradeFields.quantity.optional(),
  entryPrice: tradeFields.entryPrice.optional(),
  exitPrice: tradeFields.exitPrice.optional(),
  entryAt: tradeFields.entryAt.optional(),
  exitAt: tradeFields.exitAt.optional(),
  fees: tradeFields.fees.optional(),
  stopLoss: tradeFields.stopLoss.optional(),
  target: tradeFields.target.optional(),
  setup: tradeFields.setup.optional(),
  notes: tradeFields.notes.optional(),
  mood: tradeFields.mood.optional(),
  rating: tradeFields.rating.optional(),
  tags: tradeFields.tags.optional(),
  riskAmount: tradeFields.riskAmount.optional(),
  preTradePlan: tradeFields.preTradePlan.optional(),
  entryReason: tradeFields.entryReason.optional(),
  exitReason: tradeFields.exitReason.optional(),
  mistake: tradeFields.mistake.optional(),
  lesson: tradeFields.lesson.optional(),
  rulesFollowed: tradeFields.rulesFollowed.optional(),
});

const numeric = (value: number | null | undefined, current: string | null) => (value === undefined ? current : value == null ? null : String(value));

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!isValidUuid(id)) return notFound("Trade not found");

  const parsed = await parseBody(req, patchSchema, "Invalid update");
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  try {
    const [current] = await db.select().from(trades).where(and(eq(trades.id, id), eq(trades.userId, user.id))).limit(1);
    if (!current) return notFound("Trade not found");

    const exitPrice = numeric(body.exitPrice, current.exitPrice);
    const closed = exitPrice != null;
    const entryAt = body.entryAt ? parseTimestamp(body.entryAt)! : current.entryAt;
    let exitAt: Date | null;
    if (body.exitAt !== undefined) {
      exitAt = body.exitAt == null ? null : parseTimestamp(body.exitAt);
    } else {
      exitAt = current.exitAt;
    }
    if (!closed) exitAt = null;
    else if (!exitAt) exitAt = new Date();
    if (exitAt && exitAt < entryAt) {
      return NextResponse.json({ error: "Exit time cannot be before entry time." }, { status: 400 });
    }

    const [row] = await db
      .update(trades)
      .set({
        symbol: body.symbol ? body.symbol.toUpperCase() : current.symbol,
        name: body.name !== undefined ? body.name : current.name,
        market: body.market ?? current.market,
        side: body.side ?? current.side,
        status: closed ? "closed" : "open",
        quantity: body.quantity != null ? String(body.quantity) : current.quantity,
        entryPrice: body.entryPrice != null ? String(body.entryPrice) : current.entryPrice,
        exitPrice,
        entryAt,
        exitAt,
        fees: body.fees != null ? String(body.fees) : current.fees,
        stopLoss: numeric(body.stopLoss, current.stopLoss),
        target: numeric(body.target, current.target),
        setup: body.setup !== undefined ? body.setup : current.setup,
        notes: body.notes !== undefined ? body.notes : current.notes,
        mood: body.mood !== undefined ? body.mood : current.mood,
        rating: body.rating !== undefined ? body.rating : current.rating,
        tags: body.tags ?? current.tags,
        riskAmount: numeric(body.riskAmount, current.riskAmount),
        preTradePlan: body.preTradePlan ?? current.preTradePlan,
        entryReason: body.entryReason ?? current.entryReason,
        exitReason: body.exitReason ?? current.exitReason,
        mistake: body.mistake ?? current.mistake,
        lesson: body.lesson ?? current.lesson,
        rulesFollowed: body.rulesFollowed === undefined ? current.rulesFollowed : body.rulesFollowed,
        updatedAt: new Date(),
      })
      .where(and(eq(trades.id, id), eq(trades.userId, user.id)))
      .returning();
    return NextResponse.json({ trade: row });
  } catch (error) {
    return serverError("trades.update", error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!isValidUuid(id)) return notFound("Trade not found");
  try {
    const [row] = await db.delete(trades).where(and(eq(trades.id, id), eq(trades.userId, user.id))).returning({ id: trades.id });
    if (!row) return notFound("Trade not found");
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    return serverError("trades.delete", error);
  }
}
