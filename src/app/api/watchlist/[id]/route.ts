import { NextResponse } from "next/server";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const [row] = await db
    .delete(watchlist)
    .where(and(eq(watchlist.id, id), eq(watchlist.userId, user.id)))
    .returning({ id: watchlist.id });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: row.id });
}
