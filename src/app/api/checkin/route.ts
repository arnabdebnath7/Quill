import { NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { DATE_ONLY, dateOnly, MOOD_KEYS, parseBody, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";
const MAX_RANGE_DAYS = 400;

const schema = z.object({
  date: dateOnly,
  mood: z.enum(MOOD_KEYS).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  focus: z.number().int().min(1).max(5).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  intention: z.string().max(1000).default(""),
  tradingPlan: z.string().max(5000).default(""),
  reflection: z.string().max(5000).default(""),
});

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const params = new URL(req.url).searchParams;
  const date = params.get("date");
  const from = params.get("from");
  const to = params.get("to");

  try {
    if (date) {
      if (!DATE_ONLY.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      const [row] = await db
        .select()
        .from(dailyCheckins)
        .where(and(eq(dailyCheckins.userId, user.id), eq(dailyCheckins.date, date)))
        .limit(1);
      return NextResponse.json({ checkin: row ?? null });
    }

    if (from || to) {
      if ((from && !DATE_ONLY.test(from)) || (to && !DATE_ONLY.test(to))) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
      }
      if (from && to) {
        const span = (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000;
        if (span < 0) return NextResponse.json({ error: "`from` must be on or before `to`" }, { status: 400 });
        if (span > MAX_RANGE_DAYS) return NextResponse.json({ error: `Date range is limited to ${MAX_RANGE_DAYS} days` }, { status: 400 });
      }
      const conditions = [eq(dailyCheckins.userId, user.id)];
      if (from) conditions.push(gte(dailyCheckins.date, from));
      if (to) conditions.push(lte(dailyCheckins.date, to));
      const rows = await db.select().from(dailyCheckins).where(and(...conditions)).orderBy(asc(dailyCheckins.date)).limit(MAX_RANGE_DAYS + 1);
      return NextResponse.json({ checkins: rows });
    }
  } catch (error) {
    return serverError("checkin.get", error);
  }

  return NextResponse.json({ error: "Date or date range is required" }, { status: 400 });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const parsed = await parseBody(req, schema, "Invalid check-in");
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const values = {
    userId: user.id,
    date: body.date,
    mood: body.mood ?? null,
    energy: body.energy ?? null,
    focus: body.focus ?? null,
    sleepHours: body.sleepHours == null ? null : String(body.sleepHours),
    intention: body.intention,
    tradingPlan: body.tradingPlan,
    reflection: body.reflection,
    updatedAt: new Date(),
  };

  try {
    const [row] = await db
      .insert(dailyCheckins)
      .values(values)
      .onConflictDoUpdate({
        target: [dailyCheckins.userId, dailyCheckins.date],
        set: {
          mood: values.mood,
          energy: values.energy,
          focus: values.focus,
          sleepHours: values.sleepHours,
          intention: values.intention,
          tradingPlan: values.tradingPlan,
          reflection: values.reflection,
          updatedAt: values.updatedAt,
        },
      })
      .returning();
    return NextResponse.json({ checkin: row });
  } catch (error) {
    return serverError("checkin.save", error);
  }
}
