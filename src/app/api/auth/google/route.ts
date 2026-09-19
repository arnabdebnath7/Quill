import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    const email = decoded.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json(
        { error: "This account has no email address." },
        { status: 400 }
      );
    }

    const name =
      decoded.name?.trim() || email.split("@")[0] || "Trader";

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user =
      existing ??
      (
        await db
          .insert(users)
          .values({
            email,
            name,
            image:
              typeof decoded.picture === "string"
                ? decoded.picture
                : null,
          })
          .returning()
      )[0];

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
