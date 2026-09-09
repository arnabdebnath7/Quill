import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { trades } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const market = url.searchParams.get("market");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");

  const conds = [eq(trades.userId, user.id)];
  if (market && market !== "all") conds.push(eq(trades.market, market));
  if (status && status !== "all") conds.push(eq(trades.status, status));
  if (q) conds.push(or(ilike(trades.symbol, `%${q}%`), ilike(trades.notes, `%${q}%`), ilike(trades.setup, `%${q}%`))!);

  const rows = await db.select().from(trades).where(and(...conds)).orderBy(desc(trades.entryAt));
  return NextResponse.json({ trades: rows });
}

const createSchema = z.object({
  symbol: z.string().min(1).max(24), name: z.string().max(120).optional().nullable(),
  market: z.enum(["us", "india", "forex", "crypto", "gold"]), side: z.enum(["long", "short"]).default("long"),
  quantity: z.number().positive(), entryPrice: z.number().positive(), exitPrice: z.number().positive().optional().nullable(),
  entryAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)), exitAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  fees: z.number().min(0).default(0), stopLoss: z.number().positive().optional().nullable(), target: z.number().positive().optional().nullable(),
  setup: z.string().max(60).optional().nullable(), notes: z.string().max(4000).optional().nullable(),
  mood: z.enum(["great", "good", "neutral", "low", "rough"]).optional().nullable(), rating: z.number().int().min(1).max(5).optional().nullable(),
  tags: z.array(z.string().max(30)).max(12).default([]), riskAmount: z.number().positive().optional().nullable(),
  preTradePlan: z.string().max(5000).default(""), entryReason: z.string().max(3000).default(""), exitReason: z.string().max(3000).default(""),
  mistake: z.string().max(3000).default(""), lesson: z.string().max(3000).default(""), rulesFollowed: z.boolean().optional().nullable(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: z.infer<typeof createSchema>;
  try { body = createSchema.parse(await req.json()); } catch (e) { return NextResponse.json({ error: "Invalid trade", details: String(e) }, { status: 400 }); }

  const closed = body.exitPrice != null;
  const [row] = await db.insert(trades).values({
    userId: user.id, symbol: body.symbol.toUpperCase(), name: body.name ?? null, market: body.market, side: body.side, status: closed ? "closed" : "open",
    quantity: String(body.quantity), entryPrice: String(body.entryPrice), exitPrice: body.exitPrice != null ? String(body.exitPrice) : null,
    entryAt: new Date(body.entryAt), exitAt: closed ? new Date(body.exitAt ?? new Date()) : null, fees: String(body.fees ?? 0),
    stopLoss: body.stopLoss != null ? String(body.stopLoss) : null, target: body.target != null ? String(body.target) : null,
    setup: body.setup ?? null, notes: body.notes ?? null, mood: body.mood ?? null, rating: body.rating ?? null, tags: body.tags ?? [],
    riskAmount: body.riskAmount != null ? String(body.riskAmount) : null, preTradePlan: body.preTradePlan, entryReason: body.entryReason,
    exitReason: body.exitReason, mistake: body.mistake, lesson: body.lesson, rulesFollowed: body.rulesFollowed ?? null,
  }).returning();
  return NextResponse.json({ trade: row }, { status: 201 });
}
