import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken =
      typeof body?.idToken === "string" ? body.idToken : "";

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Firebase credential." },
        { status: 400 }
      );
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const firebaseUid = decoded.uid?.trim();
    const email = decoded.email?.toLowerCase().trim() || null;
    const phone = decoded.phone_number?.trim() || null;

    if (!firebaseUid && !email && !phone) {
      return NextResponse.json(
        { error: "This Firebase account has no usable identity." },
        { status: 400 }
      );
    }

    const name =
      decoded.name?.trim() ||
      (email ? email.split("@")[0] : null) ||
      "Trader";

    const conditions = [
      firebaseUid ? eq(users.firebaseUid, firebaseUid) : null,
      email ? eq(users.email, email) : null,
      phone ? eq(users.phone, phone) : null,
    ].filter((value): value is NonNullable<typeof value> => value !== null);

    const [existing] = await db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1);

    let user = existing;

    if (user) {
      const updates: Partial<typeof users.$inferInsert> = {};

      if (firebaseUid && !user.firebaseUid) updates.firebaseUid = firebaseUid;
      if (phone && !user.phone) updates.phone = phone;
      if (email && !user.email) updates.email = email;
      if (decoded.name?.trim() && user.name === "Trader") {
        updates.name = decoded.name.trim();
      }
      if (typeof decoded.picture === "string" && !user.image) {
        updates.image = decoded.picture;
      }

      if (Object.keys(updates).length > 0) {
        const [updated] = await db
          .update(users)
          .set(updates)
          .where(eq(users.id, user.id))
          .returning();
        user = updated;
      }
    } else {
      [user] = await db
        .insert(users)
        .values({
          email,
          phone,
          firebaseUid: firebaseUid || null,
          name,
          image: typeof decoded.picture === "string" ? decoded.picture : null,
        })
        .returning();
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
