import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isValidUuid, notFound, serverError, unauthorized } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!isValidUuid(id)) return notFound("Watchlist item not found");
  try {
    const [row] = await db.delete(watchlist).where(and(eq(watchlist.id, id), eq(watchlist.userId, user.id))).returning({ id: watchlist.id });
    if (!row) return notFound("Watchlist item not found");
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    return serverError("watchlist.delete", error);
  }
}
