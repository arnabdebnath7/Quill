import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(20000).optional(),
  mood: z.enum(["great", "good", "neutral", "low", "rough"]).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tags: z.array(z.string().max(30)).max(12).optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid update", details: String(e) }, { status: 400 });
  }

  const [row] = await db
    .update(journalEntries)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, user.id)))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ entry: row });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const [row] = await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, user.id)))
    .returning({ id: journalEntries.id });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: row.id });
}
