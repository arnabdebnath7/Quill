import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { dailyCheckins } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.enum(["great", "good", "neutral", "low", "rough"]).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  focus: z.number().int().min(1).max(5).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  intention: z.string().max(1000).default(""),
  tradingPlan: z.string().max(5000).default(""),
  reflection: z.string().max(5000).default(""),
});

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = new URL(req.url).searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  const [row] = await db.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, user.id), eq(dailyCheckins.date, date))).limit(1);
  return NextResponse.json({ checkin: row ?? null });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: "Invalid check-in", details: String(error) }, { status: 400 });
  }

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

  const [row] = await db.insert(dailyCheckins).values(values).onConflictDoUpdate({
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
  }).returning();

  return NextResponse.json({ checkin: row });
}
