import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dateOnly, likePattern, MOOD_KEYS, parseBody, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().slice(0, 80);
  const mood = url.searchParams.get("mood");

  const conds = [eq(journalEntries.userId, user.id)];
  if (mood && mood !== "all") conds.push(eq(journalEntries.mood, mood));
  if (q) {
    const pattern = likePattern(q);
    conds.push(or(ilike(journalEntries.title, pattern), ilike(journalEntries.content, pattern))!);
  }

  try {
    const rows = await db
      .select()
      .from(journalEntries)
      .where(and(...conds))
      .orderBy(desc(journalEntries.pinned), desc(journalEntries.date), desc(journalEntries.createdAt));
    return NextResponse.json({ entries: rows });
  } catch (error) {
    return serverError("journal.list", error);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(20000).default(""),
  mood: z.enum(MOOD_KEYS).nullable().optional(),
  date: dateOnly,
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  pinned: z.boolean().default(false),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const parsed = await parseBody(req, createSchema, "Invalid entry");
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  try {
    const [row] = await db
      .insert(journalEntries)
      .values({ userId: user.id, title: body.title, content: body.content, mood: body.mood ?? null, date: body.date, tags: body.tags, pinned: body.pinned })
      .returning();
    return NextResponse.json({ entry: row }, { status: 201 });
  } catch (error) {
    return serverError("journal.create", error);
  }
}
