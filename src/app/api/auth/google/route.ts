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
    console.error("[auth/google] Firebase token verification failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Google sign-in could not be verified" },
      { status: 401 }
    );
  }

  try {
    let [user] = await db.select().from(users).where(eq(users.email, identity.email)).limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ email: identity.email, name: identity.name, image: identity.picture })
        .returning();

      // Demo data is optional. A seed failure must never make authentication fail.
      try {
        await seedUserDemoData(user.id);
      } catch (e) {
        console.error("[auth/google] Demo-data seed failed; continuing login:", e);
      }
    } else if (identity.picture && user.image !== identity.picture) {
      await db.update(users).set({ image: identity.picture }).where(eq(users.id, user.id));
    }

    await createSession(user.id);
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) {
    console.error("[auth/google] Database/session error:", e);
    return NextResponse.json(
      { error: "Quill could not create your account session. Please try again." },
      { status: 500 }
    );
  }
}
