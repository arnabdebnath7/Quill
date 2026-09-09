import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { trades } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  symbol: z.string().min(1).max(24).optional(), name: z.string().max(120).optional().nullable(), market: z.enum(["us", "india", "forex", "crypto", "gold"]).optional(), side: z.enum(["long", "short"]).optional(),
  quantity: z.number().positive().optional(), entryPrice: z.number().positive().optional(), exitPrice: z.number().positive().optional().nullable(), entryAt: z.string().optional(), exitAt: z.string().optional().nullable(), fees: z.number().min(0).optional(),
  stopLoss: z.number().positive().optional().nullable(), target: z.number().positive().optional().nullable(), setup: z.string().max(60).optional().nullable(), notes: z.string().max(4000).optional().nullable(), mood: z.enum(["great", "good", "neutral", "low", "rough"]).optional().nullable(), rating: z.number().int().min(1).max(5).optional().nullable(), tags: z.array(z.string().max(30)).max(12).optional(),
  riskAmount: z.number().positive().optional().nullable(), preTradePlan: z.string().max(5000).optional(), entryReason: z.string().max(3000).optional(), exitReason: z.string().max(3000).optional(), mistake: z.string().max(3000).optional(), lesson: z.string().max(3000).optional(), rulesFollowed: z.boolean().optional().nullable(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  let body: z.infer<typeof patchSchema>; try { body = patchSchema.parse(await req.json()); } catch (e) { return NextResponse.json({ error: "Invalid update", details: String(e) }, { status: 400 }); }
  const [current] = await db.select().from(trades).where(and(eq(trades.id, id), eq(trades.userId, user.id))).limit(1);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const exitPrice = body.exitPrice === undefined ? current.exitPrice : body.exitPrice == null ? null : String(body.exitPrice);
  const [row] = await db.update(trades).set({
    symbol: body.symbol ? body.symbol.toUpperCase() : current.symbol, name: body.name !== undefined ? body.name : current.name, market: body.market ?? current.market, side: body.side ?? current.side, status: exitPrice != null ? "closed" : "open",
    quantity: body.quantity != null ? String(body.quantity) : current.quantity, entryPrice: body.entryPrice != null ? String(body.entryPrice) : current.entryPrice, exitPrice,
    entryAt: body.entryAt ? new Date(body.entryAt) : current.entryAt, exitAt: body.exitAt !== undefined ? body.exitAt == null ? null : new Date(body.exitAt) : exitPrice != null && current.exitAt == null ? new Date() : current.exitAt,
    fees: body.fees != null ? String(body.fees) : current.fees, stopLoss: body.stopLoss === undefined ? current.stopLoss : body.stopLoss == null ? null : String(body.stopLoss), target: body.target === undefined ? current.target : body.target == null ? null : String(body.target),
    setup: body.setup !== undefined ? body.setup : current.setup, notes: body.notes !== undefined ? body.notes : current.notes, mood: body.mood !== undefined ? body.mood : current.mood, rating: body.rating !== undefined ? body.rating : current.rating, tags: body.tags ?? current.tags,
    riskAmount: body.riskAmount === undefined ? current.riskAmount : body.riskAmount == null ? null : String(body.riskAmount), preTradePlan: body.preTradePlan ?? current.preTradePlan, entryReason: body.entryReason ?? current.entryReason,
    exitReason: body.exitReason ?? current.exitReason, mistake: body.mistake ?? current.mistake, lesson: body.lesson ?? current.lesson, rulesFollowed: body.rulesFollowed === undefined ? current.rulesFollowed : body.rulesFollowed, updatedAt: new Date(),
  }).where(and(eq(trades.id, id), eq(trades.userId, user.id))).returning();
  return NextResponse.json({ trade: row });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await ctx.params;
  const [row] = await db.delete(trades).where(and(eq(trades.id, id), eq(trades.userId, user.id))).returning({ id: trades.id });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 }); return NextResponse.json({ ok: true, id: row.id });
}
