import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const mood = url.searchParams.get("mood");

  const conds = [eq(journalEntries.userId, user.id)];
  if (mood && mood !== "all") conds.push(eq(journalEntries.mood, mood));
  if (q) {
    conds.push(or(ilike(journalEntries.title, `%${q}%`), ilike(journalEntries.content, `%${q}%`))!);
  }

  const rows = await db
    .select()
    .from(journalEntries)
    .where(and(...conds))
    .orderBy(desc(journalEntries.pinned), desc(journalEntries.date), desc(journalEntries.createdAt));
  return NextResponse.json({ entries: rows });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(20000).default(""),
  mood: z.enum(["great", "good", "neutral", "low", "rough"]).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tags: z.array(z.string().max(30)).max(12).default([]),
  pinned: z.boolean().default(false),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid entry", details: String(e) }, { status: 400 });
  }

  const [row] = await db
    .insert(journalEntries)
    .values({
      userId: user.id,
      title: body.title,
      content: body.content,
      mood: body.mood ?? null,
      date: body.date,
      tags: body.tags,
      pinned: body.pinned,
    })
    .returning();
  return NextResponse.json({ entry: row }, { status: 201 });
}
