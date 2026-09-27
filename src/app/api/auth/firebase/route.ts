import { NextResponse } from "next/server";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { InvalidFirebaseToken, verifyFirebaseIdToken, type FirebaseIdentity } from "@/lib/firebase-token";
import { createSession } from "@/lib/auth";
import { isSyntheticEmail, syntheticEmailFor } from "@/lib/identity";

export const runtime = "nodejs";

function displayNameFor(identity: FirebaseIdentity) {
  if (identity.name) return identity.name.slice(0, 80);
  if (identity.email && !isSyntheticEmail(identity.email)) return identity.email.split("@")[0].slice(0, 80);
  return "Trader";
}

async function findOne(where: SQL): Promise<User | null> {
  const rows = await db.select().from(users).where(where).orderBy(users.createdAt).limit(1);
  return rows[0] ?? null;
}

/**
 * Exchanges a Firebase ID token (Google or phone OTP) for a Quill session cookie.
 *
 * Account resolution, in priority order:
 *   1. a user already linked to this Firebase uid;
 *   2. the legacy phone identity email that earlier releases stored;
 *   3. a user with the same *verified* email that is not yet linked to another uid;
 *   4. otherwise a new account.
 */
export async function POST(request: Request) {
  let idToken = "";
  try {
    const body = (await request.json()) as { idToken?: unknown };
    idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "Missing Firebase credential." }, { status: 400 });
  }

  let identity: FirebaseIdentity;
  try {
    identity = await verifyFirebaseIdToken(idToken);
  } catch (error) {
    if (error instanceof InvalidFirebaseToken) {
      console.error("[auth/firebase] rejected token:", error.message);
      return NextResponse.json({ error: "Your sign-in could not be verified. Please try again." }, { status: 401 });
    }
    console.error("[auth/firebase] verification failed", error);
    return NextResponse.json({ error: "Sign-in verification is temporarily unavailable. Please try again." }, { status: 503 });
  }

  const verifiedEmail = identity.email && identity.emailVerified ? identity.email : null;
  const legacyPhoneEmail = syntheticEmailFor(identity.uid);

  try {
    let user =
      (await findOne(eq(users.firebaseUid, identity.uid))) ??
      (await findOne(and(eq(users.email, legacyPhoneEmail), isNull(users.firebaseUid))!)) ??
      (verifiedEmail ? await findOne(and(eq(users.email, verifiedEmail), isNull(users.firebaseUid))!) : null);

    if (user) {
      const updates: Partial<typeof users.$inferInsert> = {};
      if (user.firebaseUid !== identity.uid) updates.firebaseUid = identity.uid;
      if (identity.phone && user.phone !== identity.phone) updates.phone = identity.phone;
      if (identity.picture && !user.image) updates.image = identity.picture;
      if (identity.name && (user.name === "Trader" || !user.name.trim())) updates.name = identity.name.slice(0, 80);
      // Upgrade a synthetic placeholder email to the real, verified one when it becomes known.
      if (verifiedEmail && isSyntheticEmail(user.email)) {
        const taken = await findOne(eq(users.email, verifiedEmail));
        if (!taken) updates.email = verifiedEmail;
      }
      if (Object.keys(updates).length) {
        const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();
        if (updated) user = updated;
      }
    } else {
      // Email is the unique key of the users table; phone-only accounts get a
      // deterministic placeholder that the UI knows to hide.
      const email = verifiedEmail && !(await findOne(eq(users.email, verifiedEmail))) ? verifiedEmail : legacyPhoneEmail;
      const [created] = await db
        .insert(users)
        .values({
          email,
          name: displayNameFor(identity),
          image: identity.picture,
          firebaseUid: identity.uid,
          phone: identity.phone,
        })
        .returning();
      user = created;
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
  } catch (error) {
    console.error("[auth/firebase] database error", error);
    return NextResponse.json({ error: "Sign-in could not be completed. Please try again." }, { status: 500 });
  }
}
