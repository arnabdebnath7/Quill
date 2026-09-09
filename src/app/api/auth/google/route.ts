import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-verify";
import { seedUserDemoData } from "@/db/seed";

const bodySchema = z.object({
  idToken: z.string().min(50).max(8192),
});

/**
 * POST /api/auth/google
 * Real Firebase sign-in: the client completes the Google popup/redirect flow,
 * sends its short-lived ID token here, we verify it against Google's public
 * keys (issuer + audience = this Firebase project), then upsert the user and
 * issue the app's own session cookie.
 */
export async function POST(req: Request) {
  let idToken: string;
  try {
    idToken = bodySchema.parse(await req.json()).idToken;
  } catch {
    return NextResponse.json({ error: "Missing Firebase ID token" }, { status: 400 });
  }

  let identity;
  try {
    identity = await verifyFirebaseIdToken(idToken);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Google sign-in could not be verified" },
      { status: 401 }
    );
  }

  let [user] = await db.select().from(users).where(eq(users.email, identity.email)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email: identity.email, name: identity.name, image: identity.picture })
      .returning();
    // First ever sign-in gets a believable history so the app feels alive.
    await seedUserDemoData(user.id);
  } else if (identity.picture && user.image !== identity.picture) {
    await db.update(users).set({ image: identity.picture }).where(eq(users.id, user.id));
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
}
