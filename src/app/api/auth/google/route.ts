import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { createSession } from "@/lib/auth";

const PHONE_EMAIL_DOMAIN = "auth.quill.local";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.toLowerCase().trim() : "";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function phoneIdentityEmail(firebaseUid: string) {
  return `firebase-${firebaseUid}@${PHONE_EMAIL_DOMAIN}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken =
      typeof body?.idToken === "string" ? body.idToken.trim() : "";

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Firebase credential." },
        { status: 400 }
      );
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const firebaseUid =
      normalizeString(decoded.uid) ||
      normalizeString((decoded as any).user_id) ||
      normalizeString((decoded as any).sub);
    const email = normalizeEmail(decoded.email);
    const phone = normalizeString(decoded.phone_number);
    const isPhoneAuth = Boolean(phone);

    if (!firebaseUid) {
      return NextResponse.json(
        { error: "This Firebase account has no usable identity." },
        { status: 400 }
      );
    }

    const identityEmail = isPhoneAuth
      ? phoneIdentityEmail(firebaseUid)
      : email;

    if (!identityEmail) {
      return NextResponse.json(
        { error: "This Firebase account has no usable email identity." },
        { status: 400 }
      );
    }

    const name =
      normalizeString(decoded.name) ||
      (email ? email.split("@")[0] : null) ||
      (phone ? phone.slice(-4) : null) ||
      "Trader";

    const conditions = isPhoneAuth
      ? [eq(users.email, identityEmail)]
      : [eq(users.email, email)];

    // A linked Firebase phone+Google account can arrive with a phone claim
    // and an email claim. Prefer the stable phone identity in that case.
    if (isPhoneAuth && email) {
      conditions.push(eq(users.email, email));
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1);

    let user = existing;

    if (user) {
      const updates: Partial<typeof users.$inferInsert> = {};

      if (decoded.name && typeof decoded.name === "string" && user.name === "Trader") {
        updates.name = decoded.name.trim();
      }
      if (
        typeof decoded.picture === "string" &&
        decoded.picture.trim() &&
        !user.image
      ) {
        updates.image = decoded.picture.trim();
      }

      // Keep the existing database contract intact. Phone-only accounts use a
      // deterministic internal email identity because the current users table
      // requires a non-null email.
      if (Object.keys(updates).length > 0) {
        const [updated] = await db
          .update(users)
          .set(updates)
          .where(eq(users.id, user.id))
          .returning();

        if (updated) user = updated;
      }
    } else {
      const [created] = await db
        .insert(users)
        .values({
          email: identityEmail,
          name,
          image:
            typeof decoded.picture === "string"
              ? decoded.picture.trim() || null
              : null,
        })
        .returning();

      user = created;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Could not create the local user account." },
        { status: 500 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name },
    });
  } catch (error) {
    console.error("[auth/firebase] error", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
    ) {
      const code = (error as { code: string }).code;

      if (
        code.includes("invalid") ||
        code.includes("expired") ||
        code.includes("signature") ||
        code.includes("aud")
      ) {
        return NextResponse.json(
          { error: "Firebase sign-in verification failed. Please try again." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "Sign-in could not be completed. Please try again." },
      { status: 500 }
    );
  }
}
