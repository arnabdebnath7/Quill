import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dateOnly, isValidUuid, MOOD_KEYS, notFound, parseBody, serverError, unauthorized } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(20000).optional(),
  mood: z.enum(MOOD_KEYS).nullable().optional(),
  date: dateOnly.optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!isValidUuid(id)) return notFound("Entry not found");

  const parsed = await parseBody(req, patchSchema, "Invalid update");
  if ("response" in parsed) return parsed.response;

  try {
    const [row] = await db
      .update(journalEntries)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, user.id)))
      .returning();
    if (!row) return notFound("Entry not found");
    return NextResponse.json({ entry: row });
  } catch (error) {
    return serverError("journal.update", error);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!isValidUuid(id)) return notFound("Entry not found");

  try {
    const [row] = await db
      .delete(journalEntries)
      .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, user.id)))
      .returning({ id: journalEntries.id });
    if (!row) return notFound("Entry not found");
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    return serverError("journal.delete", error);
  }
}
